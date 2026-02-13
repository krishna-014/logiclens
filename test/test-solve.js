/**
 * Automated smoke test for the LogicLens server.
 * Tests /health and /solve endpoints.
 */

const BASE_URL = 'http://localhost:3000';

// Simple 1x1 red pixel PNG as base64
const TINY_TEST_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

async function test(name, fn) {
    try {
        await fn();
        console.log(`  ✅ ${name}`);
    } catch (err) {
        console.log(`  ❌ ${name}: ${err.message}`);
    }
}

async function run() {
    console.log('\n🧪 LogicLens Server Tests\n');

    // Test 1: Health check
    await test('GET /health returns 200', async () => {
        const res = await fetch(`${BASE_URL}/health`);
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
        const data = await res.json();
        if (data.status !== 'ok') throw new Error(`Status is "${data.status}", expected "ok"`);
        console.log(`    → uptime: ${data.uptime}s, apiKeyConfigured: ${data.apiKeyConfigured}`);
    });

    // Test 2: Solve without image
    await test('POST /solve without image returns 400', async () => {
        const res = await fetch(`${BASE_URL}/solve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });
        if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
        const data = await res.json();
        if (data.code !== 'NO_IMAGE') throw new Error(`Expected code NO_IMAGE, got "${data.code}"`);
    });

    // Test 3: Solve with image (depends on API key being valid)
    await test('POST /solve with image (AI response)', async () => {
        const res = await fetch(`${BASE_URL}/solve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: TINY_TEST_IMAGE }),
        });
        const data = await res.json();
        console.log(`    → Status: ${res.status}`);
        if (data.error) {
            console.log(`    → Error: ${data.error.substring(0, 100)}`);
            console.log(`    → (This is expected if API key is a placeholder)`);
        } else {
            console.log(`    → Answer: ${data.answer}`);
            console.log(`    → Steps: ${data.steps?.length || 0} steps`);
        }
    });

    console.log('\n🏁 Tests complete.\n');
}

run().catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
});
