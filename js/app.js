// DOM Elements
const views = {
    home: document.getElementById('view-home'),
    analyzing: document.getElementById('view-analyzing'),
    result: document.getElementById('view-result'),
    history: document.getElementById('view-history'),
    settings: document.getElementById('view-settings')
};

const components = {
    scanBtn: document.getElementById('scan-btn'),
    uploadBtn: document.getElementById('upload-btn'),
    fileInput: document.getElementById('file-upload'),
    problemPreview: document.getElementById('problem-preview'),
    problemText: document.getElementById('problem-text-display'),
    stepsContainer: document.getElementById('steps-container'),
    finalAnswer: document.getElementById('final-answer'),
    explanation: document.getElementById('concept-explanation'),
    analysisStep: document.getElementById('analysis-step'),
    backToHome: document.getElementById('back-to-home'),
    historyContainer: document.getElementById('history-container'),
    clearHistoryBtn: document.getElementById('clear-history')
};

// Mock Data for Demo
const MOCK_SOLUTIONS = [
    {
        type: 'math',
        previewText: '∫ x² dx',
        steps: [
            'Identify the rule: ∫ x^n dx = (x^(n+1))/(n+1) + C',
            'Here, n = 2',
            'Apply the rule: (x^(2+1))/(2+1)',
            'Simplify: x³/3'
        ],
        answer: 'x³/3 + C',
        explanation: 'The power rule for integration states that the integral of x to the power of n is x to the power of n plus one, divided by n plus one, plus the integration constant C.'
    },
    {
        type: 'science',
        previewText: 'What is Photosynthesis?',
        steps: [
            'Plants absorb sunlight using chlorophyll.',
            'Water is absorbed from the roots.',
            'CO₂ is taken from the air.',
            'Chemical Reaction: 6CO₂ + 6H₂O + Light → C₆H₁₂O₆ + 6O₂'
        ],
        answer: 'Glucose + Oxygen',
        explanation: 'Photosynthesis is the process by which green plants and some other organisms use sunlight to synthesize foods with the help of chlorophyll pigments.'
    }
];

// State
let currentStep = 0;

// Navigation
function navigateTo(viewName) {
    Object.values(views).forEach(view => {
        if (view) view.classList.remove('active');
    });
    if (views[viewName]) views[viewName].classList.add('active');
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {

    // Scan Button (Simulate Camera Capture)
    components.scanBtn?.addEventListener('click', () => {
        // For demo purposes, use a mock image or trigger file input
        // Real app would use getUserMedia
        components.fileInput.click();
    });

    // File Upload
    components.uploadBtn?.addEventListener('click', () => {
        components.fileInput.click();
    });

    components.fileInput?.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                // Set preview image
                if (components.problemPreview) {
                    components.problemPreview.style.backgroundImage = `url(${e.target.result})`;
                    components.problemPreview.style.backgroundSize = 'contain';
                    components.problemPreview.style.backgroundRepeat = 'no-repeat';
                    components.problemPreview.style.backgroundPosition = 'center';
                }
                startAnalysis(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    });

    // Back Navigation
    components.backToHome?.addEventListener('click', () => {
        navigateTo('home');
    });

    // Clear History
    components.clearHistoryBtn?.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear your history?')) {
            localStorage.removeItem('logicLensHistory');
            renderHistory();
        }
    });

    // Navbar Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget.dataset.view;
            navigateTo(target);

            if (target === 'history') {
                renderHistory();
            }

            // Update active state
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
        });
    });
    // Generate Floating Particles
    createParticles();

    // Animate "How It Works" steps on scroll
    const flowSteps = document.querySelectorAll('.flow-step');
    if (flowSteps.length) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.2 });
        flowSteps.forEach(step => observer.observe(step));
    }
});

function createParticles() {
    const container = document.getElementById('particles-container');
    const particleCount = 20;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');

        // Random positioning
        const x = Math.random() * 100;
        const y = Math.random() * 100;

        // Random size
        const size = Math.random() * 4 + 1; // 1px to 5px

        // Random opacity
        const opacity = Math.random() * 0.3 + 0.05;

        // Random float duration
        const duration = Math.random() * 20 + 10; // 10s to 30s
        const delay = Math.random() * -20;

        particle.style.left = `${x}%`;
        particle.style.top = `${y}%`;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.opacity = opacity;

        // CSS Animation (injected here or in CSS)
        particle.style.animation = `floatUp ${duration}s linear infinite`;
        particle.style.animationDelay = `${delay}s`;

        container.appendChild(particle);
    }
}

// Logic
async function startAnalysis(imageData) {
    navigateTo('analyzing');

    const character = document.getElementById('ai-character');
    const procText = document.getElementById('processing-text');

    // Reset character to thinking state
    character.className = 'ai-character thinking';
    if (procText) procText.textContent = 'Hmm, let me think...';

    const steps = [
        "Analyzing the problem...",
        "Looking at the details...",
        "Running AI reasoning...",
        "Almost there..."
    ];

    let stepIndex = 0;

    // Simulate steps for UI feedback
    const interval = setInterval(() => {
        if (components.analysisStep) {
            components.analysisStep.style.opacity = 0;
            setTimeout(() => {
                components.analysisStep.textContent = steps[stepIndex % steps.length];
                components.analysisStep.style.opacity = 1;
            }, 200);
        }
        stepIndex++;
    }, 1200);

    // Determine API URL based on environment
    const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:')
        ? 'http://localhost:3000'
        : 'https://logiclens-mp9l.onrender.com';

    try {
        const response = await fetch(`${API_BASE_URL}/solve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ image: imageData })
        });

        clearInterval(interval);

        const data = await response.json();

        if (!response.ok) {
            // Show the actual server error
            const errMsg = data?.error || 'Failed to process image';
            console.error('Server error:', errMsg);

            if (errMsg.includes('loading') || errMsg.includes('timed out') || errMsg.includes('try again')) {
                alert(`⏳ AI models are warming up.\n\n${errMsg}\n\nPlease wait 30 seconds and try again.`);
            } else {
                alert(`❌ ${errMsg}`);
            }
            navigateTo('home');
            return;
        }

        // EUREKA! Character found the answer
        character.className = 'ai-character eureka';
        if (procText) procText.textContent = '💡 I got it!';
        if (components.analysisStep) components.analysisStep.textContent = 'Solution found!';

        // Wait to let the eureka animation play, then show result with OK state
        await new Promise(r => setTimeout(r, 2000));

        // OK state briefly before transitioning
        character.className = 'ai-character ok';
        if (procText) procText.textContent = '✅ Here you go!';

        await new Promise(r => setTimeout(r, 800));

        showResult(data);

    } catch (error) {
        clearInterval(interval);
        console.error('Error:', error);
        alert('❌ Network error. Make sure the server is running at http://localhost:3000');
        navigateTo('home');
    }
}

// --- Kid-friendly step simplifier (frontend-only, does NOT touch backend) ---
function simplifyStep(rawStep) {
    let simple = rawStep;

    // Break down common complex math/science phrases into simpler words
    const simplifications = [
        [/\bintegral\b/gi, 'the area under the curve'],
        [/\bdifferentiate\b/gi, 'find how fast it changes'],
        [/\bderivative\b/gi, 'rate of change'],
        [/\bsubstitution\b/gi, 'replacing one part with something simpler'],
        [/\bsymmetry property\b/gi, 'a shortcut because both sides are mirror images'],
        [/\btrigonometric functions\b/gi, 'sin, cos, tan (angle-based math)'],
        [/\btrigonometric\b/gi, 'angle-based'],
        [/\bintegrand\b/gi, 'the expression inside the integral'],
        [/\bevaluates to\b/gi, 'gives us the answer of'],
        [/\bsimplif(?:y|ied|ies|ying)\b/gi, 'make it easier'],
        [/\bcoefficient\b/gi, 'the number in front'],
        [/\bvariable\b/gi, 'the unknown letter (like x)'],
        [/\bconstant\b/gi, 'a fixed number that doesn\'t change'],
        [/\bequation\b/gi, 'math sentence with an equals sign'],
        [/\bexpression\b/gi, 'math phrase'],
        [/\bdenominator\b/gi, 'bottom number of a fraction'],
        [/\bnumerator\b/gi, 'top number of a fraction'],
        [/\bfactor(?:ize|s)?\b/gi, 'break it into smaller parts that multiply together'],
        [/\bhypothesis\b/gi, 'an educated guess'],
        [/\bvelocity\b/gi, 'speed with direction'],
        [/\bacceleration\b/gi, 'how quickly speed changes'],
        [/\bequilibrium\b/gi, 'a balanced state'],
        [/\bexponent(?:ial)?\b/gi, 'power (how many times to multiply)'],
        [/\blogarithm\b/gi, 'the reverse of raising to a power'],
        [/\bpolynomial\b/gi, 'an expression with multiple terms like x² + 3x + 2'],
        [/\bquadratic\b/gi, 'an equation where the highest power is 2 (like x²)'],
        [/\bproportion(?:al)?\b/gi, 'when two things grow or shrink together'],
        [/\breciprocal\b/gi, 'flip the fraction (1 divided by the number)'],
        [/\bperpendicular\b/gi, 'at a 90° right angle'],
        [/\bparallel\b/gi, 'lines that never cross'],
        [/\bcongruent\b/gi, 'same shape and size'],
        [/\btheorem\b/gi, 'a proven math rule'],
        [/\bmolecule\b/gi, 'tiny particle made of atoms joined together'],
        [/\bphotosynthesis\b/gi, 'how plants make food using sunlight'],
        [/\boxidation\b/gi, 'a chemical reaction with oxygen'],
        [/\bcatalyst\b/gi, 'something that speeds up a reaction without being used up'],
    ];

    simplifications.forEach(([pattern, replacement]) => {
        simple = simple.replace(pattern, replacement);
    });

    return simple;
}

function getStepEmoji(index, total) {
    if (index === 0) return '🔍';         // First step: look at the problem
    if (index === total - 1) return '✅';  // Last step: answer
    const midEmojis = ['🧩', '💡', '📝', '⚡', '🎯', '🔧', '📐', '🧮'];
    return midEmojis[(index - 1) % midEmojis.length];
}

function renderSteps(container, steps) {
    container.innerHTML = '';
    steps.forEach((step, index) => {
        const emoji = getStepEmoji(index, steps.length);
        const simplified = simplifyStep(step);
        const stepDiv = document.createElement('div');
        stepDiv.className = 'step-item';
        stepDiv.innerHTML = `
            <div class="step-number">${index + 1}</div>
            <div class="step-content-wrap">
                <p class="step-text-simple"><span class="step-emoji">${emoji}</span> ${simplified}</p>
            </div>
        `;
        container.appendChild(stepDiv);
    });
}

function showResult(solutionData) {
    // Use provided data or fallback to mock (though now we drive via API)
    const solution = solutionData || MOCK_SOLUTIONS[Math.floor(Math.random() * MOCK_SOLUTIONS.length)];

    // Populate UI
    if (components.problemText) components.problemText.textContent = solution.previewText;
    if (components.finalAnswer) components.finalAnswer.innerHTML = solution.answer;
    if (components.explanation) components.explanation.textContent = solution.explanation;

    // Save to History
    saveToHistory(solution);

    // Clear and populate steps with simplified, kid-friendly rendering
    if (components.stepsContainer) {
        renderSteps(components.stepsContainer, solution.steps);
    }

    navigateTo('result');

    // Staggered step reveal animation
    const stepItems = document.querySelectorAll('.step-item');
    stepItems.forEach((item, i) => {
        setTimeout(() => {
            item.classList.add('step-visible');
        }, 300 * (i + 1));
    });
}

// History Functions
function saveToHistory(solution) {
    const historyItem = {
        ...solution,
        date: new Date().toLocaleDateString(),
        timestamp: Date.now()
    };

    let history = JSON.parse(localStorage.getItem('logicLensHistory') || '[]');
    history.unshift(historyItem); // Add to top
    if (history.length > 50) history.pop(); // Limit to 50
    localStorage.setItem('logicLensHistory', JSON.stringify(history));
}

function renderHistory() {
    if (!components.historyContainer) return;

    const history = JSON.parse(localStorage.getItem('logicLensHistory') || '[]');
    components.historyContainer.innerHTML = '';

    if (history.length === 0) {
        components.historyContainer.innerHTML = '<div class="empty-state">No history yet</div>';
        return;
    }

    history.forEach((item, index) => {
        const el = document.createElement('div');
        el.className = 'history-item glass-card';
        el.innerHTML = `
            <div class="history-info">
                <h4>${item.previewText}</h4>
                <div class="history-date">${item.date}</div>
            </div>
            <div class="history-type">${item.type}</div>
        `;
        el.addEventListener('click', () => {
            // For simplicity, just show the result again directly (using the item data)
            // We can refactor showResult to accept data, but for now let's just re-mock it or alert
            // Ideally we should have a 'loadSolution(data)' function.
            loadSolution(item);
        });
        components.historyContainer.appendChild(el);
    });
}

function loadSolution(data) {
    // Populate UI from history data
    if (components.problemText) components.problemText.textContent = data.previewText;
    if (components.finalAnswer) components.finalAnswer.textContent = data.answer;
    if (components.explanation) components.explanation.textContent = data.explanation;

    if (components.stepsContainer) {
        renderSteps(components.stepsContainer, data.steps);
    }
    navigateTo('result');

    // Staggered step reveal animation
    const stepItems = document.querySelectorAll('.step-item');
    stepItems.forEach((item, i) => {
        setTimeout(() => {
            item.classList.add('step-visible');
        }, 300 * (i + 1));
    });
}

// Settings Toggle Logic
document.querySelectorAll('.toggle-switch').forEach(toggle => {
    toggle.addEventListener('click', () => {
        toggle.classList.toggle('active');
        // Here you would save the setting preference
    });
});
