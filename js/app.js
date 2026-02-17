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
});

// Logic
async function startAnalysis(imageData) {
    navigateTo('analyzing');

    const steps = [
        "Scanning Image...",
        "Enhancing Quality...",
        "Detecting Equations...",
        "Solving..."
    ];

    let stepIndex = 0;

    // Simulate steps for UI feedback
    const interval = setInterval(() => {
        if (components.analysisStep) {
            components.analysisStep.textContent = steps[stepIndex % steps.length];
            components.analysisStep.classList.remove('pulse-text');
            void components.analysisStep.offsetWidth; // trigger reflow
            components.analysisStep.classList.add('pulse-text');
        }
        stepIndex++;
    }, 800);

    // Determine API URL based on environment
    const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
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

            // Check if it's a model-loading issue
            if (errMsg.includes('loading') || errMsg.includes('timed out') || errMsg.includes('try again')) {
                alert(`⏳ AI models are warming up.\n\n${errMsg}\n\nPlease wait 30 seconds and try again.`);
            } else {
                alert(`❌ ${errMsg}`);
            }
            navigateTo('home');
            return;
        }

        showResult(data);

    } catch (error) {
        clearInterval(interval);
        console.error('Error:', error);
        alert('❌ Network error. Make sure the server is running at http://localhost:3000');
        navigateTo('home');
    }
}

function showResult(solutionData) {
    // Use provided data or fallback to mock (though now we drive via API)
    const solution = solutionData || MOCK_SOLUTIONS[Math.floor(Math.random() * MOCK_SOLUTIONS.length)];

    // Populate UI
    if (components.problemText) components.problemText.textContent = solution.previewText;
    if (components.finalAnswer) components.finalAnswer.textContent = solution.answer;
    if (components.explanation) components.explanation.textContent = solution.explanation;

    // Save to History
    saveToHistory(solution);

    // Clear and populate steps
    if (components.stepsContainer) {
        components.stepsContainer.innerHTML = '';
        solution.steps.forEach((step, index) => {
            const stepHtml = `
                <div class="step-item">
                    <div class="step-number">${index + 1}</div>
                    <p class="step-text">${step}</p>
                </div>
            `;
            components.stepsContainer.innerHTML += stepHtml;
        });
    }

    navigateTo('result');
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
        components.stepsContainer.innerHTML = '';
        data.steps.forEach((step, index) => {
            const stepHtml = `
                <div class="step-item">
                    <div class="step-number">${index + 1}</div>
                    <p class="step-text">${step}</p>
                </div>
            `;
            components.stepsContainer.innerHTML += stepHtml;
        });
    }
    navigateTo('result');
}

// Settings Toggle Logic
document.querySelectorAll('.toggle-switch').forEach(toggle => {
    toggle.addEventListener('click', () => {
        toggle.classList.toggle('active');
        // Here you would save the setting preference
    });
});
