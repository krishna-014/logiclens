/**
 * Environment Configuration Utility
 * Loads and validates all required environment variables.
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Derive __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve .env from the PROJECT ROOT (two levels up from server/utils/)
const envPath = path.resolve(__dirname, '..', '..', '.env');

// Load environment variables from the correct .env file
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error(`❌ Failed to load .env file at: ${envPath}`);
    console.error(`   Error: ${result.error.message}`);
    console.error(`   Make sure a .env file exists in the project root.`);
} else {
    console.log(`✅ .env loaded from: ${envPath}`);
}

// ─── TEMP DEBUG (remove after confirming) ─────────────────────────
console.log("🔑 HF KEY:", process.env.HUGGINGFACE_API_KEY ? `${process.env.HUGGINGFACE_API_KEY.substring(0, 8)}...` : "undefined");
// ──────────────────────────────────────────────────────────────────

/**
 * Validate required environment variables
 */
export function validateEnv() {
    const required = ['HUGGINGFACE_API_KEY'];
    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        console.error(`\n❌ Missing required environment variables:`);
        missing.forEach(key => console.error(`   - ${key}`));
        console.error(`\n   Please add them to your .env file at: ${envPath}\n`);
        return false;
    }

    // Warn if placeholder key is still set
    if (process.env.HUGGINGFACE_API_KEY === 'hf_your_key_here') {
        console.warn(`\n⚠️  HUGGINGFACE_API_KEY is still set to the placeholder value.`);
        console.warn(`   Please replace it with your real API key from https://huggingface.co/settings/tokens\n`);
        return false;
    }

    console.log(`✅ All environment variables validated.`);
    return true;
}

export const config = {
    port: parseInt(process.env.PORT, 10) || 3000,
    hfApiKey: process.env.HUGGINGFACE_API_KEY,
    nodeEnv: process.env.NODE_ENV || 'development',
};
