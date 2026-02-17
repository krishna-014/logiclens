import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

const HF_ROUTER_URL = 'https://router.huggingface.co/v1/chat/completions';
const MODEL = 'Qwen/Qwen2.5-VL-7B-Instruct';
const API_KEY = process.env.HUGGINGFACE_API_KEY;

console.log(`Testing HF API with model: ${MODEL}`);
console.log(`API Key present: ${!!API_KEY}`);

if (!API_KEY) {
    console.error('❌ No API Key found in .env');
    process.exit(1);
}

async function test() {
    try {
        const response = await fetch(HF_ROUTER_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: 'user', content: 'What is 2+2?' }
                ],
                max_tokens: 10,
            }),
        });

        const text = await response.text();
        console.log(`Status: ${response.status}`);
        console.log(`Response: ${text}`);

    } catch (err) {
        console.error('❌ Fetch error:', err);
    }
}

test();
