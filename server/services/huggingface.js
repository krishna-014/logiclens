/**
 * HuggingFace Inference Service (v3 — Production)
 * 
 * Architecture:
 *   Uses the new OpenAI-compatible /v1/chat/completions endpoint at
 *   router.huggingface.co. The old api-inference.huggingface.co is deprecated (410).
 * 
 * Pipeline:
 *   1. Try VLM (Vision-Language Model) — sends the image directly to a multimodal model
 *      that can both read the image AND solve the problem in one shot.
 *   2. Fallback: LLM-only — if no vision model is available, ask the user to
 *      describe the problem or use a text-based solver.
 */
import { config } from '../utils/env.js';
import { logger } from '../utils/logger.js';

// ─── Model Configuration ────────────────────────────────────────────
// Only try one vision model to avoid long wait times on free tier
const VISION_MODELS = [
    'Qwen/Qwen2.5-VL-7B-Instruct',     // Smallest/fastest vision model
];

const TEXT_LLM = 'mistralai/Mistral-7B-Instruct-v0.2'; // Confirmed working

const HF_ROUTER_URL = 'https://router.huggingface.co/v1/chat/completions';
const VISION_TIMEOUT_MS = 20_000;  // 20s for vision (fail fast)
const TEXT_TIMEOUT_MS = 60_000;    // 60s for text LLM

// ─── Core API Call ──────────────────────────────────────────────────

async function chatCompletion(model, messages, maxTokens = 512, timeoutMs = TEXT_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        logger.info(`HF Chat → ${model}`);

        const response = await fetch(HF_ROUTER_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.hfApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                messages,
                max_tokens: maxTokens,
                temperature: 0.3,
            }),
            signal: controller.signal,
        });

        const responseText = await response.text();

        if (!response.ok) {
            logger.error(`HF ${response.status} (${model}): ${responseText.substring(0, 300)}`);
            throw new Error(`HF API ${response.status}: ${responseText.substring(0, 200)}`);
        }

        const data = JSON.parse(responseText);
        const content = data?.choices?.[0]?.message?.content || '';
        logger.info(`HF response from ${model}: ${content.substring(0, 150)}...`);
        return content;

    } catch (err) {
        if (err.name === 'AbortError') {
            throw new Error(`Request to ${model} timed out (${timeoutMs / 1000}s). Try again.`);
        }
        throw err;
    } finally {
        clearTimeout(timeout);
    }
}

// ─── Vision Pipeline ────────────────────────────────────────────────

/**
 * Attempt to use a VLM to read the image AND solve the problem in one call.
 * Tries multiple vision models in order until one works.
 */
async function tryVisionSolve(base64Image) {
    const imageUrl = base64Image.startsWith('data:')
        ? base64Image
        : `data:image/png;base64,${base64Image}`;

    const messages = [
        {
            role: 'user',
            content: [
                {
                    type: 'image_url',
                    image_url: { url: imageUrl },
                },
                {
                    type: 'text',
                    text: `You are a world-class math and science tutor who explains things so clearly that even a 10-year-old can follow along. Look at this image very carefully.

YOUR TASK:
1. Read and extract the EXACT problem, equation, or question shown in the image. Be precise — copy every symbol, number, and operator exactly.
2. Solve the problem CORRECTLY with full mathematical rigor. Double-check your arithmetic and algebra.
3. Show EVERY step of working — do NOT skip any calculation. Each step should be one clear action.
4. Explain each step in simple, friendly language that any student can understand.
5. Verify your final answer by substituting back or checking the logic.

RULES FOR STEPS:
- Write at least 5 detailed steps (more if the problem is complex).
- Each step must show the math/formula AND a simple explanation of what you are doing and why.
- Use phrases like "First, let's...", "Now we...", "This means...", "So we get..."
- If using a math property or formula, name it AND explain what it does in simple words.
- NEVER skip intermediate calculations. Show every line of working.
- The final step must clearly state the final answer.

Respond ONLY with valid JSON in this exact format (no extra text before or after):
{
  "previewText": "the problem exactly as written in the image",
  "answer": "the final answer (use proper math notation like π/4, √2, etc.)",
  "steps": ["Step 1: [what you do] — [simple explanation]", "Step 2: ...", "..."],
  "explanation": "A simple, friendly summary of the concept used and why the answer makes sense"
}`
                }
            ]
        }
    ];

    for (const model of VISION_MODELS) {
        try {
            logger.info(`Trying vision model: ${model}`);
            const content = await chatCompletion(model, messages, 1200, VISION_TIMEOUT_MS);
            if (content && content.length > 10) {
                return parseResponse(content);
            }
        } catch (err) {
            logger.warn(`Vision model ${model} failed: ${err.message.substring(0, 100)}`);
        }
    }

    return null; // All vision models failed
}

// ─── Text-Only Fallback ─────────────────────────────────────────────

/**
 * Fallback: use the text LLM to solve a described problem.
 * Used when vision models fail but we can extract some text.
 */
async function textOnlySolve(problemText) {
    const messages = [
        {
            role: 'user',
            content: `You are a world-class math and science tutor who explains things so clearly that even a 10-year-old can follow along.

Problem: "${problemText}"

SOLVE THIS STEP BY STEP:
1. Solve the problem CORRECTLY with full mathematical rigor. Double-check your work.
2. Show EVERY step of working — do NOT skip any calculation.
3. Each step should show the math AND a simple explanation of what you are doing.
4. Write at least 5 detailed steps. Use friendly language like "First, let's...", "Now we...", "This gives us...".
5. If using a formula or property, name it AND explain what it does simply.
6. The final step must clearly state the final answer.
7. Verify your answer before responding.

Respond ONLY with valid JSON in this exact format (no extra text):
{
  "answer": "the final answer (use proper math notation)",
  "steps": ["Step 1: [action] — [explanation]", "Step 2: ...", "..."],
  "explanation": "A simple, friendly summary of the concept and why the answer makes sense"
}`
        }
    ];

    logger.info(`Text LLM solving: "${problemText.substring(0, 80)}"`);
    const content = await chatCompletion(TEXT_LLM, messages, 1200);
    return parseResponse(content, problemText);
}

// ─── Main Exported Function ─────────────────────────────────────────

/**
 * Main solve function — orchestrates the full pipeline.
 * @param {string} base64Image - Full data URI or raw base64 of the image
 * @returns {Promise<object>} Solution object
 */
export async function solveFromImage(base64Image) {
    // Step 1: Try vision model (reads image + solves in one shot)
    logger.info('=== Starting solve pipeline ===');

    const visionResult = await tryVisionSolve(base64Image);
    if (visionResult) {
        logger.info('✅ Vision model succeeded');
        return visionResult;
    }

    // Step 2: All vision models failed — use text LLM to provide a helpful response
    logger.warn('All vision models failed. Falling back to text LLM...');
    try {
        const fallbackResult = await textOnlySolve(
            'The user uploaded an image of a math/science problem but the vision models could not process it. Generate a helpful response explaining that the image could not be read and suggest they try: 1) a clearer photo, 2) better lighting, 3) typing the problem instead.'
        );
        if (fallbackResult) {
            fallbackResult.previewText = 'Image could not be read';
            fallbackResult.answer = 'Could not read image';
            fallbackResult.steps = [
                'The AI vision models were unable to process this image.',
                'Try taking a clearer, well-lit photo of the problem.',
                'Make sure the text/equations are clearly visible.',
                'Alternatively, you can type the problem directly.'
            ];
            fallbackResult.explanation = 'The free-tier AI vision models may be temporarily unavailable or the image quality was insufficient. Please try again or use the text input option.';
            return fallbackResult;
        }
    } catch (err) {
        logger.error(`Text LLM fallback also failed: ${err.message}`);
    }

    throw new Error('All AI models are currently unavailable. Please try again in a few minutes.');
}

// ─── Text-only solve endpoint for described problems ────────────────

export async function solveFromText(text) {
    return textOnlySolve(text);
}

// ─── Response Parser ────────────────────────────────────────────────

function parseResponse(text, fallbackPreview = '') {
    if (!text) return null;

    const fallback = {
        previewText: fallbackPreview || 'Problem',
        answer: 'See explanation below',
        steps: text.split('\n').filter(l => l.trim().length > 0),
        explanation: text,
    };

    try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                previewText: parsed.previewText || fallbackPreview || 'Problem',
                answer: parsed.answer || fallback.answer,
                steps: Array.isArray(parsed.steps) ? parsed.steps : fallback.steps,
                explanation: parsed.explanation || fallback.explanation,
            };
        }
    } catch (err) {
        logger.warn('JSON parse failed, using text fallback.');
    }

    return fallback;
}
