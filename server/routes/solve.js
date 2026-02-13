/**
 * /solve route — accepts an image, runs vision AI or OCR + LLM, returns a solution.
 */
import { Router } from 'express';
import { solveFromImage, solveFromText } from '../services/huggingface.js';
import { logger } from '../utils/logger.js';
import { config } from '../utils/env.js';

const router = Router();

// Maximum allowed base64 image size (~10MB decoded)
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * POST /solve — solve a problem from an image
 * Body: { image: "data:image/png;base64,..." }
 */
router.post('/solve', async (req, res) => {
    const startTime = Date.now();

    try {
        // ─── Validate API key ───────────────────────────────────────
        if (!config.hfApiKey || config.hfApiKey === 'hf_your_key_here') {
            logger.error('API key not configured');
            return res.status(503).json({
                error: 'Server is not configured. The HuggingFace API key is missing.',
                code: 'MISSING_API_KEY',
            });
        }

        // ─── Validate image payload ─────────────────────────────────
        const { image } = req.body;

        if (!image) {
            return res.status(400).json({
                error: 'No image provided. Please send a base64-encoded image in the "image" field.',
                code: 'NO_IMAGE',
            });
        }

        if (typeof image !== 'string') {
            return res.status(400).json({
                error: 'Invalid image format. Expected a base64 string.',
                code: 'INVALID_FORMAT',
            });
        }

        // Strip the data URI header for size check
        const cleanBase64 = image.replace(/^data:image\/\w+;base64,/, '');
        const estimatedSize = (cleanBase64.length * 3) / 4;

        if (estimatedSize > MAX_IMAGE_SIZE_BYTES) {
            return res.status(413).json({
                error: `Image too large (${(estimatedSize / 1024 / 1024).toFixed(1)}MB). Maximum is 10MB.`,
                code: 'IMAGE_TOO_LARGE',
            });
        }

        logger.info(`POST /solve — image size: ${(estimatedSize / 1024).toFixed(1)}KB`);

        // ─── Solve ──────────────────────────────────────────────────
        const solution = await solveFromImage(image);

        const duration = Date.now() - startTime;
        logger.info(`✅ Solve complete (${duration}ms)`);

        res.json(solution);

    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(`❌ Solve failed (${duration}ms): ${error.message}`);

        res.status(500).json({
            error: error.message || 'An unexpected error occurred while processing the image.',
            code: 'PROCESSING_ERROR',
        });
    }
});

/**
 * POST /solve-text — solve a problem from text description
 * Body: { text: "solve 2x + 3 = 7" }
 */
router.post('/solve-text', async (req, res) => {
    const startTime = Date.now();

    try {
        if (!config.hfApiKey || config.hfApiKey === 'hf_your_key_here') {
            return res.status(503).json({ error: 'API key not configured', code: 'MISSING_API_KEY' });
        }

        const { text } = req.body;
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return res.status(400).json({ error: 'No problem text provided.', code: 'NO_TEXT' });
        }

        logger.info(`POST /solve-text — "${text.substring(0, 80)}"`);
        const solution = await solveFromText(text.trim());
        const duration = Date.now() - startTime;
        logger.info(`✅ Text solve complete (${duration}ms)`);
        res.json(solution);

    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(`❌ Text solve failed (${duration}ms): ${error.message}`);
        res.status(500).json({ error: error.message, code: 'PROCESSING_ERROR' });
    }
});

export default router;
