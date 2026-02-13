/**
 * LogicLens AI — Production Server
 * 
 * A hardened Express server for AI-powered math & science solving.
 * Features:
 *  - Correct .env loading from project root
 *  - Request timeouts (30s)
 *  - Payload size limits
 *  - Structured logging
 *  - Graceful shutdown
 *  - Uncaught exception handling
 *  - Security headers (no API key leaks)
 */
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// ─── Load environment FIRST (before anything uses config) ────────
import { config, validateEnv } from './utils/env.js';
import { logger } from './utils/logger.js';

// ─── Routes ──────────────────────────────────────────────────────
import solveRoute from './routes/solve.js';
import healthRoute from './routes/health.js';

// ─── Derive __dirname for ES modules ────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// ─── Validate environment ───────────────────────────────────────
const envValid = validateEnv();
if (!envValid) {
    logger.warn('Server starting with missing/invalid configuration. Some features may not work.');
}

// ─── Express App Setup ──────────────────────────────────────────
const app = express();

// Security: Remove X-Powered-By header
app.disable('x-powered-by');

// CORS — allow frontend origin
app.use(cors({
    origin: true,                     // Allow same-origin in dev
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    maxAge: 86400,                    // Cache preflight for 24h
}));

// Body parsing with size limit
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: false, limit: '15mb' }));

// Serve static files from project root (index.html, css/, js/)
app.use(express.static(PROJECT_ROOT, {
    maxAge: config.nodeEnv === 'production' ? '1d' : 0,
}));

// ─── Request Timeout Middleware ─────────────────────────────────
const REQUEST_TIMEOUT_MS = 60_000; // 60 seconds overall

app.use((req, res, next) => {
    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
        logger.warn(`Request timeout: ${req.method} ${req.url}`);
        if (!res.headersSent) {
            res.status(408).json({
                error: 'Request timed out. Please try again with a smaller image.',
                code: 'TIMEOUT',
            });
        }
    });
    next();
});

// ─── Request Logging Middleware ──────────────────────────────────
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        // Only log API calls, not static file requests
        if (req.url.startsWith('/solve') || req.url.startsWith('/health')) {
            logger.request(req.method, req.url, res.statusCode, duration);
        }
    });
    next();
});

// ─── API Routes ─────────────────────────────────────────────────
app.use(solveRoute);
app.use(healthRoute);

// ─── 404 Fallback ───────────────────────────────────────────────
app.use((req, res) => {
    // If it looks like an API call, return JSON 404
    if (req.url.startsWith('/api') || req.headers.accept?.includes('application/json')) {
        return res.status(404).json({ error: 'Endpoint not found', code: 'NOT_FOUND' });
    }
    // Otherwise serve index.html for SPA fallback
    res.sendFile(path.join(PROJECT_ROOT, 'index.html'));
});

// ─── Global Error Handler ───────────────────────────────────────
app.use((err, req, res, _next) => {
    logger.error(`Unhandled error: ${err.message}`);
    logger.error(err.stack);

    if (!res.headersSent) {
        res.status(500).json({
            error: 'An internal server error occurred.',
            code: 'INTERNAL_ERROR',
        });
    }
});

// ─── Start Server ───────────────────────────────────────────────
const server = app.listen(config.port, () => {
    logger.info(`🚀 LogicLens server running at http://localhost:${config.port}`);
    logger.info(`📂 Serving static files from: ${PROJECT_ROOT}`);
    logger.info(`🔧 Environment: ${config.nodeEnv}`);
    if (!envValid) {
        logger.warn(`⚠️  Fix your .env file to enable AI features.`);
    }
});

// Set server-level timeout
server.timeout = REQUEST_TIMEOUT_MS;

// ─── Graceful Shutdown ──────────────────────────────────────────
function gracefulShutdown(signal) {
    logger.info(`\n${signal} received. Shutting down gracefully...`);
    server.close(() => {
        logger.info('Server closed.');
        process.exit(0);
    });

    // Force exit after 10s if close hangs
    setTimeout(() => {
        logger.error('Forced shutdown after timeout.');
        process.exit(1);
    }, 10_000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ─── Uncaught Exception / Rejection Handlers ────────────────────
process.on('uncaughtException', (err) => {
    logger.error(`UNCAUGHT EXCEPTION: ${err.message}`);
    logger.error(err.stack);
    gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
    logger.error(`UNHANDLED REJECTION: ${reason}`);
    // Don't crash on unhandled promise rejections — log and continue
});

export default app;
