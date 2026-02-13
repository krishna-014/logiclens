import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';


// Load environment variables
console.log("SERVER FILE LOADED FROM HERE");
console.log(process.env.HUGGINGFACE_API_KEY);


dotenv.config();
console.log("LOADED KEY:", process.env.HUGGINGFACE_API_KEY);

console.log("ENV:", process.env.HUGGINGFACE_API_KEY);
console.log("HF KEY:", process.env.HUGGINGFACE_API_KEY);



const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.static('.'));
app.use(express.json({ limit: '50mb' })); // Increase limit for base64 images

// Check API Key
if (!process.env.HUGGINGFACE_API_KEY) {
   console.warn('⚠️ WARNING: HUGGINGFACE_API_KEY is missing in .env');

}

// Hugging Face Inference API Configuration
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
const OCR_MODEL = "microsoft/trocr-base-handwritten"; // Good for handwritten math
const LLM_MODEL = "microsoft/Phi-3-mini-4k-instruct"; // Good general reasoning

// Helper: Call Hugging Face API
async function queryHF(model, data) {
    const response = await fetch(
        `https://router.huggingface.co/hf-inference/models/${model}`,
        {
            headers: {
                Authorization: `Bearer ${HF_API_KEY}`,
                "Content-Type": "application/json",
            },
            method: "POST",
            body: JSON.stringify(data),
        }
    );

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`HF API Error: ${error}`);
    }

    return await response.json();
}

// Solve Endpoint
app.post('/solve', async (req, res) => {
    try {
        const { image } = req.body; // Expecting base64 image data (e.g., "data:image/png;base64,...")

        if (!image) {
            return res.status(400).json({ error: 'No image provided' });
        }

        if (!HF_API_KEY) {
            return res.status(500).json({ error: 'Server configuration error: Missing API Key' });
        }

        console.log('Received solve request...');

        // Step 1: OCR (extract text from image)
        // Note: TrOCR expects raw image bytes or URL. Sending base64 as inputs works for some endpoints, 
        // but usually needs raw bytes. However, the Inference API often accepts base64 JSON payload for image models.
        // Let's try sending the base64 string directly in the payload as "inputs".

        // Clean base64 string if it has the header
        const cleanBase64 = image.replace(/^data:image\/\w+;base64,/, "");

        // For TrOCR, we might need to send binary. 
        // However, to keep it simple, let's assume we use a model that accepts base64 or we just pass the text if it's a text problem.
        // Actually, handling raw image upload properly is tricky without `multer` or similar, but let's stick to JSON base64 for simplicity in prototype.

        // Alternative: Use a Vision-Language Model (VLM) like `impira/layoutlm-document-qa` or `donut-base`.
        // Let's try a VLM approach: "What is this math problem and what is the solution?"
        // Model: `llava-hf/llava-1.5-7b-hf` (often available).

        // Let's stick to the text generation for now if we can't easily do OCR.
        // BUT user specifically asked for OCR.
        // Let's try a simplified flow: 
        // 1. Send image to OCR model.
        // 2. Send text to LLM.

        // Attempt OCR with microsoft/trocr-base-handwritten
        // The HF Inference API for this model usually takes binary data.
        // Let's try to fetch the binary buffer from base64.
        const imageBuffer = Buffer.from(cleanBase64, 'base64');

        const ocrResponse = await fetch(
            `https://router.huggingface.co/hf-inference/models/${OCR_MODEL}`,
            {
                headers: {
                    Authorization: `Bearer ${HF_API_KEY}`,
                    "Content-Type": "application/octet-stream", // Binary
                },
                method: "POST",
                body: imageBuffer,
            }
        );

        if (!ocrResponse.ok) {
            const err = await ocrResponse.text();
            console.error('OCR Error:', err);
            throw new Error(`OCR Failed: ${err}`);
        }

        const ocrResult = await ocrResponse.json();
        // Expected output: [{ generated_text: "..." }]
        const detectedText = ocrResult[0]?.generated_text || "Could not detect text";
        console.log('Detected Text:', detectedText);

        // Step 2: Solve with LLM
        const prompt = `
    You are a helpful math and science tutor.
    Problem: "${detectedText}"
    
    Please provide:
    1. The final answer.
    2. A step-by-step explanation.
    3. The concept used.
    
    Format the output as valid JSON with keys: "answer", "steps" (array of strings), "explanation".
    `;

        const llmResponse = await queryHF(LLM_MODEL, {
            inputs: prompt,
            parameters: {
                max_new_tokens: 512,
                return_full_text: false,
                temperature: 0.7
            }
        });

        // Parse LLM response
        // Ideally the model returns JSON, but it might be chatty.
        // For this prototype, we'll just return the raw text if parsing fails.
        let generatedText = llmResponse[0]?.generated_text || "";

        // Try to extract JSON
        let solution = {
            previewText: detectedText,
            answer: "See explanation",
            steps: [generatedText],
            explanation: "AI generated solution"
        };

        try {
            // simple heuristic to find JSON block
            const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                solution = { ...solution, ...parsed };
            } else {
                // If not JSON, just put text in explanation
                solution.explanation = generatedText;
                solution.steps = generatedText.split('\n').filter(line => line.trim().length > 0);
            }
        } catch (e) {
            console.warn('Failed to parse LLM JSON', e);
        }

        res.json(solution);

    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
