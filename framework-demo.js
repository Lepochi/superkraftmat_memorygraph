/**
 * Framework Demo and Testing Tool
 * Interactive tool for testing and demonstrating framework capabilities
 */

class FrameworkDemoTool {
    constructor() {
        this.baseUrl = 'http://localhost:8000/api/framework';
        this.demoScenarios = [
            {
                name: 'New Project Discussion',
                input: 'I want to start a new Shopify migration project for our e-commerce platform',
                expected: ['tier1', 'tier2'],
                description: 'Should trigger business intelligence and project momentum'
            },
            {
                name: 'Supplier Inquiry',
                input: 'Can you tell me about our suppliers and their farm stories for the traceability report?',
                expected: ['tier1', 'tier3'],
                description: 'Should trigger business intelligence and operational context'
            },
            {
                name: 'Technical Implementation',
                input: 'I need help with the Wix authentication system configuration and setup procedures',
                expected: ['tier2', 'tier3'],
                description: 'Should trigger project momentum and operational context'
            },
            {
                name: 'Business Strategy',
                input: 'What is our current market position and how do our products compare to competitors?',
                expected: ['tier1'],
                description: 'Should primarily trigger business intelligence'
            },
            {
                name: 'General Question',
                input: 'How are you doing today?',
                expected: ['tier1'],
                description: 'Should only trigger basic business intelligence'
            }
        ];
        this.init();
    }

    async init() {
        this.createDemoPanel();
        await this.runHealthCheck();
    }

    createDemoPanel() {
        const demoPanel = document.createElement('div');
        demoPanel.id = 'framework-demo';
        demoPanel.className = 'demo-panel';
        demoPanel.innerHTML = `
            <div class="demo-header">
                <h2>🧪 Framework Demo & Testing Tool</h2>
                <div class="demo-status">
                    <span class="status-dot"></span>
                    <span class="status-text">Initializing...</span>
                </div>
            </div>
            
            <div class="demo-content">
                <div class="demo-controls">
                    <button id="run-all-tests" class="btn-demo">Run All Tests</button>
                    <button id="health-check" class="btn-demo-secondary">Health Check</button>
                    <button id="clear-results" class="btn-demo-secondary">Clear Results</button>
                </div>
                
                <div class="test-scenarios">
                    <h3>Test Scenarios</h3>
                    <div id="scenario-list" class="scenario-list">
                        ${this.renderScenarios()}
                    </div>
                </div>
                
                <div class="custom-test">
                    <h3>Custom Test</h3>
                    <div class="custom-input">
                        <textarea id="custom-input" placeholder="Enter your test input here..."></textarea>
                        <button id="test-custom" class="btn-demo">Test Custom Input</button>
                    </div>
                </div>
                
                <div class="results-panel">
                    <h3>Results</h3>
                    <div id="test-results" class="test-results">
                        <p class="no-results">No tests run yet</p>
                    </div>
                </div>
            </div>
        `;

        // Add to page
        document.body.appendChild(demoPanel);
        this.bindEvents();
        this.addStyles();
    }

    renderScenarios() {
        return this.demoScenarios.map((scenario, index) => `
            <div class="scenario-item" data-index="${index}">
                <div class="scenario-header">
                    <h4>${scenario.name}</h4>
                    <button class="btn-test-single" data-index="${index}">Test</button>
                </div>
                <p class="scenario-description">${scenario.description}</p>
                <div class="scenario-input">"${scenario.input}"</div>
                <div class="scenario-expected">Expected: ${scenario.expected.join(', ')}</div>
            </div>
        `).join('');
    }

    bindEvents() {
        // Run all tests
        document.getElementById('run-all-tests').addEventListener('click', () => {
            this.runAllTests();
        });

        // Health check
        document.getElementById('health-check').addEventListener('click', () => {
            this.runHealthCheck();
        });

        // Clear results
        document.getElementById('clear-results').addEventListener('click', () => {
            this.clearResults();
        });

        // Custom test
        document.getElementById('test-custom').addEventListener('click', () => {
            this.testCustomInput();
        });

        // Individual scenario tests
        document.querySelectorAll('.btn-test-single').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.testScenario(index);
            });
        });
    }

    async runHealthCheck() {
        try {
            this.updateStatus('Checking health...', 'checking');
            const response = await fetch(`${this.baseUrl}/health`);
            const health = await response.json();
            
            if (health.status === 'healthy') {
                this.updateStatus('Framework Healthy', 'healthy');
                this.addResult('Health Check', 'PASS', `
                    <strong>System Status:</strong> ${health.status}<br>
                    <strong>Entities:</strong> ${health.memory_entities}<br>
                    <strong>Relations:</strong> ${health.memory_relations}<br>
                    <strong>Cache Size:</strong> ${health.cache_size}<br>
                    <strong>Features:</strong> ${Object.keys(health.features).filter(f => health.features[f]).join(', ')}
                `);
            } else {
                this.updateStatus('Framework Unhealthy', 'error');
                this.addResult('Health Check', 'FAIL', health.error || 'Unknown error');
            }
        } catch (error) {
            this.updateStatus('Framework Error', 'error');
            this.addResult('Health Check', 'FAIL', error.message);
        }
    }

    async runAllTests() {
        this.clearResults();
        this.updateStatus('Running tests...', 'testing');
        
        let passCount = 0;
        let totalTests = this.demoScenarios.length;

        for (let i = 0; i < this.demoScenarios.length; i++) {
            const result = await this.testScenario(i, false);
            if (result.passed) passCount++;
        }

        const status = passCount === totalTests ? 'All tests passed!' : `${passCount}/${totalTests} tests passed`;
        this.updateStatus(status, passCount === totalTests ? 'healthy' : 'warning');
    }

    async testScenario(index, addToResults = true) {
        const scenario = this.demoScenarios[index];
        
        try {
            // Test analysis
            const analysisResponse = await fetch(`${this.baseUrl}/analyze?input=${encodeURIComponent(scenario.input)}`);
            const analysis = await analysisResponse.json();

            // Test context retrieval
            const contextResponse = await fetch(`${this.baseUrl}/context?input=${encodeURIComponent(scenario.input)}`);
            const context = await contextResponse.json();

            // Evaluate results
            const result = this.evaluateScenarioResult(scenario, analysis, context);
            
            if (addToResults) {
                this.addResult(scenario.name, result.passed ? 'PASS' : 'FAIL', result.details);
            }

            return result;

        } catch (error) {
            const result = { passed: false, details: `Error: ${error.message}` };
            if (addToResults) {
                this.addResult(scenario.name, 'ERROR', error.message);
            }
            return result;
        }
    }

    evaluateScenarioResult(scenario, analysis, context) {
        let details = '';
        let passed = true;
        let issues = [];

        // Check if analysis was successful
        if (!analysis.success) {
            issues.push('Analysis failed');
            passed = false;
        }

        // Check if context was retrieved
        if (!context.success) {
            issues.push('Context retrieval failed');
            passed = false;
        }

        if (analysis.success && context.success) {
            // Check tier activation
            const activatedTiers = [];
            if (context.context.tier1 && !context.context.tier1.enabled === false) activatedTiers.push('tier1');
            if (context.context.tier2 && !context.context.tier2.enabled === false) activatedTiers.push('tier2');
            if (context.context.tier3 && !context.context.tier3.enabled === false) activatedTiers.push('tier3');

            const expectedTiers = scenario.expected;
            const tiersMatch = expectedTiers.every(tier => activatedTiers.includes(tier));

            if (!tiersMatch) {
                issues.push(`Expected tiers: ${expectedTiers.join(', ')}, Got: ${activatedTiers.join(', ')}`);
                passed = false;
            }

            details = `
                <strong>Input Analysis:</strong><br>
                • Confidence: ${Math.round(analysis.analysis.confidence * 100)}%<br>
                • Intent: ${analysis.analysis.intent}<br>
                • Triggers: ${analysis.analysis.triggers.join(', ') || 'None'}<br>
                <strong>Context Retrieved:</strong><br>
                • Activated Tiers: ${activatedTiers.join(', ') || 'None'}<br>
                • Token Count: ${context.context.metadata.tokenCount}<br>
                ${issues.length > 0 ? '<strong>Issues:</strong><br>• ' + issues.join('<br>• ') : ''}
            `;
        } else {
            details = issues.join('<br>');
        }

        return { passed, details };
    }

    async testCustomInput() {
        const input = document.getElementById('custom-input').value.trim();
        if (!input) {
            alert('Please enter some text to test');
            return;
        }

        try {
            // Test analysis
            const analysisResponse = await fetch(`${this.baseUrl}/analyze?input=${encodeURIComponent(input)}`);
            const analysis = await analysisResponse.json();

            // Test context retrieval
            const contextResponse = await fetch(`${this.baseUrl}/context?input=${encodeURIComponent(input)}`);
            const context = await contextResponse.json();

            let details = '';
            if (analysis.success && context.success) {
                const activatedTiers = [];
                if (context.context.tier1 && !context.context.tier1.enabled === false) activatedTiers.push('tier1');
                if (context.context.tier2 && !context.context.tier2.enabled === false) activatedTiers.push('tier2');
                if (context.context.tier3 && !context.context.tier3.enabled === false) activatedTiers.push('tier3');

                details = `
                    <strong>Input:</strong> "${input}"<br>
                    <strong>Analysis:</strong><br>
                    • Confidence: ${Math.round(analysis.analysis.confidence * 100)}%<br>
                    • Intent: ${analysis.analysis.intent}<br>
                    • Triggers: ${analysis.analysis.triggers.join(', ') || 'None'}<br>
                    <strong>Context:</strong><br>
                    • Activated Tiers: ${activatedTiers.join(', ') || 'None'}<br>
                    • Token Count: ${context.context.metadata.tokenCount}<br>
                    • Recommended Tiers: ${analysis.analysis.recommended_tiers.join(', ')}
                `;
            } else {
                details = 'Failed to analyze input or retrieve context';
            }

            this.addResult('Custom Test', analysis.success && context.success ? 'PASS' : 'FAIL', details);

        } catch (error) {
            this.addResult('Custom Test', 'ERROR', error.message);
        }
    }

    updateStatus(text, type) {
        const statusText = document.querySelector('.demo-status .status-text');
        const statusDot = document.querySelector('.demo-status .status-dot');
        
        if (statusText) statusText.textContent = text;
        if (statusDot) {
            statusDot.className = `status-dot ${type}`;
        }
    }

    addResult(testName, status, details) {
        const resultsContainer = document.getElementById('test-results');
        
        // Remove "no results" message
        const noResults = resultsContainer.querySelector('.no-results');
        if (noResults) noResults.remove();

        const resultElement = document.createElement('div');
        resultElement.className = `test-result ${status.toLowerCase()}`;
        resultElement.innerHTML = `
            <div class="result-header">
                <span class="test-name">${testName}</span>
                <span class="test-status ${status.toLowerCase()}">${status}</span>
            </div>
            <div class="result-details">${details}</div>
        `;

        resultsContainer.appendChild(resultElement);
        resultsContainer.scrollTop = resultsContainer.scrollHeight;
    }

    clearResults() {
        const resultsContainer = document.getElementById('test-results');
        resultsContainer.innerHTML = '<p class="no-results">No tests run yet</p>';
    }

    addStyles() {
        const styles = `
            <style>
                .demo-panel {
                    position: fixed;
                    top: 20px;
                    left: 20px;
                    width: 500px;
                    max-height: 80vh;
                    background: var(--surface-secondary, #161b22);
                    border: 1px solid var(--border-primary, #30363d);
                    border-radius: 12px;
                    padding: 20px;
                    z-index: 10000;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui;
                    color: var(--text-primary, #f0f6fc);
                    overflow-y: auto;
                    backdrop-filter: blur(20px);
                }

                .demo-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                    border-bottom: 1px solid var(--border-secondary, #21262d);
                }

                .demo-header h2 {
                    margin: 0;
                    font-size: 1.1rem;
                    font-weight: 600;
                }

                .demo-status {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.85rem;
                }

                .status-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: #6b7280;
                }

                .status-dot.healthy { background: #10b981; }
                .status-dot.error { background: #ef4444; }
                .status-dot.warning { background: #f59e0b; }
                .status-dot.checking { background: #3b82f6; animation: pulse 2s infinite; }
                .status-dot.testing { background: #8b5cf6; animation: pulse 2s infinite; }

                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }

                .demo-controls {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 20px;
                    flex-wrap: wrap;
                }

                .btn-demo {
                    background: var(--accent-color, #58a6ff);
                    border: none;
                    border-radius: 6px;
                    color: white;
                    padding: 8px 12px;
                    font-size: 0.85rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .btn-demo:hover {
                    background: var(--accent-hover, #4dabf7);
                    transform: translateY(-1px);
                }

                .btn-demo-secondary {
                    background: var(--surface-primary, #0d1117);
                    border: 1px solid var(--border-primary, #30363d);
                    border-radius: 6px;
                    color: var(--text-secondary, #7d8590);
                    padding: 8px 12px;
                    font-size: 0.85rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .btn-demo-secondary:hover {
                    border-color: var(--accent-color, #58a6ff);
                    color: var(--text-primary, #f0f6fc);
                }

                .test-scenarios h3,
                .custom-test h3,
                .results-panel h3 {
                    margin: 20px 0 10px 0;
                    font-size: 0.95rem;
                    font-weight: 500;
                }

                .scenario-item {
                    background: var(--surface-primary, #0d1117);
                    border: 1px solid var(--border-secondary, #21262d);
                    border-radius: 8px;
                    padding: 15px;
                    margin-bottom: 12px;
                }

                .scenario-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                }

                .scenario-header h4 {
                    margin: 0;
                    font-size: 0.9rem;
                    font-weight: 500;
                }

                .btn-test-single {
                    background: var(--accent-color, #58a6ff);
                    border: none;
                    border-radius: 4px;
                    color: white;
                    padding: 4px 8px;
                    font-size: 0.75rem;
                    cursor: pointer;
                }

                .scenario-description {
                    font-size: 0.8rem;
                    color: var(--text-secondary, #7d8590);
                    margin: 0 0 8px 0;
                }

                .scenario-input {
                    font-size: 0.8rem;
                    font-style: italic;
                    color: var(--text-primary, #f0f6fc);
                    margin-bottom: 4px;
                    padding: 8px;
                    background: var(--surface-secondary, #161b22);
                    border-radius: 4px;
                }

                .scenario-expected {
                    font-size: 0.75rem;
                    color: var(--accent-color, #58a6ff);
                }

                .custom-input {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .custom-input textarea {
                    background: var(--surface-primary, #0d1117);
                    border: 1px solid var(--border-primary, #30363d);
                    border-radius: 6px;
                    color: var(--text-primary, #f0f6fc);
                    padding: 10px;
                    font-size: 0.9rem;
                    resize: vertical;
                    min-height: 60px;
                }

                .test-results {
                    max-height: 300px;
                    overflow-y: auto;
                    background: var(--surface-primary, #0d1117);
                    border: 1px solid var(--border-secondary, #21262d);
                    border-radius: 6px;
                    padding: 12px;
                }

                .test-result {
                    border-left: 3px solid #6b7280;
                    padding: 10px;
                    margin-bottom: 10px;
                    background: var(--surface-secondary, #161b22);
                    border-radius: 4px;
                }

                .test-result.pass { border-left-color: #10b981; }
                .test-result.fail { border-left-color: #ef4444; }
                .test-result.error { border-left-color: #f59e0b; }

                .result-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                }

                .test-name {
                    font-weight: 500;
                    font-size: 0.9rem;
                }

                .test-status {
                    font-size: 0.75rem;
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-weight: 500;
                }

                .test-status.pass { background: rgba(16, 185, 129, 0.2); color: #10b981; }
                .test-status.fail { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
                .test-status.error { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }

                .result-details {
                    font-size: 0.8rem;
                    color: var(--text-secondary, #7d8590);
                    line-height: 1.4;
                }

                .no-results {
                    text-align: center;
                    color: var(--text-secondary, #7d8590);
                    font-style: italic;
                    margin: 20px 0;
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styles);
    }
}

// Initialize demo tool when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we're in development mode
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.frameworkDemo = new FrameworkDemoTool();
    }
});
