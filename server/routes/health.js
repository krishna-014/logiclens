/**
 * /health route — server health check endpoint.
 */
import { Router } from 'express';
import { config } from '../utils/env.js';

const router = Router();

router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        env: config.nodeEnv,
        apiKeyConfigured: !!(config.hfApiKey && config.hfApiKey !== 'hf_your_key_here'),
    });
});

export default router;
