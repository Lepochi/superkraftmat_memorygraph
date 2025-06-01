/**
 * Memory Framework UI Integration
 * Adds framework functionality to the existing memory UI
 */

class MemoryFramework {
    constructor() {
        this.baseUrl = import.meta.env.VITE_API_URL 
            ? `${import.meta.env.VITE_API_URL}/api/framework`
            : 'http://localhost:8000/api/framework';
        this.isEnabled = false;
        this.currentContext = null;
        this.init();
    }

    async init() {
        try {
            await this.checkHealth();
            this.isEnabled = true;
            this.initUI();
            console.log('✅ Memory Framework initialized successfully');
        } catch (error) {
            console.error('❌ Framework initialization failed:', error);
            this.showFrameworkError('Framework system unavailable');
        }
    }

    async checkHealth() {
        const response = await fetch(`${this.baseUrl}/health`);
        if (!response.ok) {
            throw new Error(`Health check failed: ${response.status}`);
        }
        return await response.json();
    }

    initUI() {
        // Add framework panel to existing UI
        this.createFrameworkPanel();
        this.addFrameworkControls();
        this.bindFrameworkEvents();
    }

    createFrameworkPanel() {
        const frameworkPanel = document.createElement('div');
        frameworkPanel.id = 'framework-panel';
        frameworkPanel.className = 'framework-panel';
        frameworkPanel.innerHTML = `
            <div class="framework-header">
                <h3>🧠 Memory Framework</h3>
                <div class="framework-status">
                    <span class="status-indicator ${this.isEnabled ? 'active' : 'inactive'}"></span>
                    <span class="status-text">${this.isEnabled ? 'Active' : 'Inactive'}</span>
                </div>
            </div>
            
            <div class="framework-content">
                <div class="input-analyzer">
                    <h4>Input Analyzer</h4>
                    <div class="analyzer-controls">
                        <input type="text" id="framework-input" placeholder="Enter text to analyze..." />
                        <button id="analyze-btn" class="btn-primary">Analyze</button>
                    </div>
                    <div id="analysis-results" class="analysis-results"></div>
                </div>
                
                <div class="context-preview">
                    <h4>Context Preview</h4>
                    <div class="tier-toggles">
                        <label><input type="checkbox" id="tier1-toggle" checked> Tier 1: Business Intelligence</label>
                        <label><input type="checkbox" id="tier2-toggle" checked> Tier 2: Project Momentum</label>
                        <label><input type="checkbox" id="tier3-toggle"> Tier 3: Operational Context</label>
                    </div>
                    <div id="context-display" class="context-display"></div>
                </div>
                
                <div class="framework-stats">
                    <h4>Framework Statistics</h4>
                    <div id="stats-display" class="stats-display">
                        <div class="stat-item">
                            <span class="stat-label">Cache Hit Rate:</span>
                            <span class="stat-value">N/A</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Avg Context Size:</span>
                            <span class="stat-value">N/A</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Pattern Matches:</span>
                            <span class="stat-value">N/A</span>
                        </div>
                    </div>
                    <button id="refresh-stats-btn" class="btn-secondary">Refresh Stats</button>
                </div>
            </div>
        `;

        // Add to sidebar or create floating panel
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.appendChild(frameworkPanel);
        } else {
            document.body.appendChild(frameworkPanel);
            frameworkPanel.style.position = 'fixed';
            frameworkPanel.style.right = '20px';
            frameworkPanel.style.top = '20px';
            frameworkPanel.style.width = '400px';
            frameworkPanel.style.zIndex = '1000';
        }
    }

    addFrameworkControls() {
        // Add framework controls to existing entity actions
        const entityActions = document.querySelector('.entity-actions');
        if (entityActions) {
            const frameworkBtn = document.createElement('button');
            frameworkBtn.className = 'btn-framework';
            frameworkBtn.innerHTML = '🧠 Framework Analysis';
            frameworkBtn.onclick = () => this.analyzeSelectedEntity();
            entityActions.appendChild(frameworkBtn);
        }

        // Add context menu item
        const contextMenu = document.querySelector('.context-menu');
        if (contextMenu) {
            const frameworkItem = document.createElement('div');
            frameworkItem.className = 'context-menu-item';
            frameworkItem.innerHTML = '🧠 Analyze with Framework';
            frameworkItem.onclick = () => this.analyzeSelectedEntity();
            contextMenu.appendChild(frameworkItem);
        }
    }

    bindFrameworkEvents() {
        // Input analyzer
        const analyzeBtn = document.getElementById('analyze-btn');
        const frameworkInput = document.getElementById('framework-input');
        
        if (analyzeBtn && frameworkInput) {
            analyzeBtn.addEventListener('click', () => this.analyzeInput());
            frameworkInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.analyzeInput();
            });
        }

        // Tier toggles
        ['tier1-toggle', 'tier2-toggle', 'tier3-toggle'].forEach(id => {
            const toggle = document.getElementById(id);
            if (toggle) {
                toggle.addEventListener('change', () => this.updateContextDisplay());
            }
        });

        // Stats refresh
        const refreshStatsBtn = document.getElementById('refresh-stats-btn');
        if (refreshStatsBtn) {
            refreshStatsBtn.addEventListener('click', () => this.refreshStats());
        }

        // Auto-analyze on entity selection
        document.addEventListener('entitySelected', (event) => {
            this.analyzeEntityContext(event.detail.entity);
        });
    }

    async analyzeInput() {
        const input = document.getElementById('framework-input').value.trim();
        if (!input) return;

        try {
            this.showAnalyzing();
            
            const response = await fetch(`${this.baseUrl}/analyze?input=${encodeURIComponent(input)}`);
            const result = await response.json();
            
            if (result.success) {
                this.displayAnalysisResults(result.analysis);
                await this.getContextForInput(input);
            } else {
                this.showError('Analysis failed');
            }
        } catch (error) {
            console.error('Analysis error:', error);
            this.showError('Analysis failed');
        }
    }

    async getContextForInput(input) {
        try {
            const response = await fetch(`${this.baseUrl}/context?input=${encodeURIComponent(input)}`);
            const result = await response.json();
            
            if (result.success) {
                this.currentContext = result.context;
                this.updateContextDisplay();
            }
        } catch (error) {
            console.error('Context retrieval error:', error);
        }
    }

    displayAnalysisResults(analysis) {
        const resultsDiv = document.getElementById('analysis-results');
        if (!resultsDiv) return;

        resultsDiv.innerHTML = `
            <div class="analysis-summary">
                <div class="confidence-bar">
                    <label>Confidence: ${Math.round(analysis.confidence * 100)}%</label>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${analysis.confidence * 100}%"></div>
                    </div>
                </div>
                
                <div class="triggers-list">
                    <label>Detected Triggers:</label>
                    <div class="triggers">
                        ${analysis.triggers.map(trigger => 
                            `<span class="trigger-tag">${trigger}</span>`
                        ).join('')}
                    </div>
                </div>
                
                <div class="intent-display">
                    <label>Detected Intent:</label>
                    <span class="intent-tag intent-${analysis.intent}">${analysis.intent}</span>
                </div>
                
                <div class="recommendations">
                    <label>Recommended Tiers:</label>
                    <div class="tier-recommendations">
                        ${analysis.recommended_tiers.map(tier => 
                            `<span class="tier-tag tier-${tier}">${tier.toUpperCase()}</span>`
                        ).join('')}
                    </div>
                </div>
                
                <div class="context-size">
                    <label>Estimated Context Size:</label>
                    <span class="size-info">${analysis.estimated_context_size.estimated_tokens} tokens</span>
                </div>
            </div>
        `;
    }

    updateContextDisplay() {
        const contextDiv = document.getElementById('context-display');
        if (!contextDiv || !this.currentContext) return;

        const tier1Enabled = document.getElementById('tier1-toggle')?.checked;
        const tier2Enabled = document.getElementById('tier2-toggle')?.checked;
        const tier3Enabled = document.getElementById('tier3-toggle')?.checked;

        let contextHtml = '';

        if (tier1Enabled && this.currentContext.tier1) {
            contextHtml += this.renderTierContext('Tier 1: Business Intelligence', this.currentContext.tier1);
        }

        if (tier2Enabled && this.currentContext.tier2) {
            contextHtml += this.renderTierContext('Tier 2: Project Momentum', this.currentContext.tier2);
        }

        if (tier3Enabled && this.currentContext.tier3) {
            contextHtml += this.renderTierContext('Tier 3: Operational Context', this.currentContext.tier3);
        }

        contextDiv.innerHTML = contextHtml || '<p class="no-context">No context available</p>';
    }

    renderTierContext(title, tierData) {
        if (tierData.enabled === false) {
            return `
                <div class="tier-section tier-disabled">
                    <h5>${title}</h5>
                    <p class="disabled-reason">${tierData.reason || 'Not activated'}</p>
                </div>
            `;
        }

        const sections = Object.entries(tierData)
            .filter(([key, value]) => key !== 'priority' && key !== 'confidence' && Array.isArray(value))
            .map(([key, value]) => {
                if (value.length === 0) return '';
                return `
                    <div class="context-section">
                        <h6>${key.replace(/([A-Z])/g, ' $1').trim()}</h6>
                        <ul>
                            ${value.map(item => `<li>${item.name || item}</li>`).join('')}
                        </ul>
                    </div>
                `;
            }).join('');

        return `
            <div class="tier-section">
                <h5>${title} <span class="confidence">(${Math.round((tierData.confidence || 1) * 100)}%)</span></h5>
                ${sections}
            </div>
        `;
    }

    async refreshStats() {
        try {
            const response = await fetch(`${this.baseUrl}/stats`);
            const stats = await response.json();
            
            this.displayStats(stats);
        } catch (error) {
            console.error('Stats refresh error:', error);
        }
    }

    displayStats(stats) {
        const statsDiv = document.getElementById('stats-display');
        if (!statsDiv) return;

        statsDiv.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">Total Entities:</span>
                <span class="stat-value">${stats.memory_overview.total_entities}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Total Relations:</span>
                <span class="stat-value">${stats.memory_overview.total_relations}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Entity Types:</span>
                <span class="stat-value">${stats.memory_overview.entity_types}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Cache Size:</span>
                <span class="stat-value">${stats.cache_stats.size}</span>
            </div>
            <div class="tier-distribution">
                <h6>Tier Distribution:</h6>
                <div class="tier-stats">
                    <div class="tier-stat">
                        <span>Tier 1:</span>
                        <span>${stats.tier_classification.tier1_business_intelligence}</span>
                    </div>
                    <div class="tier-stat">
                        <span>Tier 2:</span>
                        <span>${stats.tier_classification.tier2_project_momentum}</span>
                    </div>
                    <div class="tier-stat">
                        <span>Tier 3:</span>
                        <span>${stats.tier_classification.tier3_operational_context}</span>
                    </div>
                </div>
            </div>
        `;
    }

    async analyzeSelectedEntity() {
        const selectedEntity = this.getSelectedEntity();
        if (!selectedEntity) {
            this.showError('No entity selected');
            return;
        }

        const entityText = `${selectedEntity.name} ${selectedEntity.entityType} ${selectedEntity.observations.join(' ')}`;
        document.getElementById('framework-input').value = entityText;
        await this.analyzeInput();
    }

    async analyzeEntityContext(entity) {
        if (!entity) return;
        
        const entityText = `${entity.name} ${entity.entityType}`;
        await this.getContextForInput(entityText);
    }

    getSelectedEntity() {
        // This would integrate with existing entity selection logic
        return window.memoryUI?.selectedEntity || null;
    }

    showAnalyzing() {
        const resultsDiv = document.getElementById('analysis-results');
        if (resultsDiv) {
            resultsDiv.innerHTML = '<div class="analyzing">🔍 Analyzing...</div>';
        }
    }

    showError(message) {
        const resultsDiv = document.getElementById('analysis-results');
        if (resultsDiv) {
            resultsDiv.innerHTML = `<div class="error">❌ ${message}</div>`;
        }
    }

    showFrameworkError(message) {
        const statusText = document.querySelector('.framework-status .status-text');
        if (statusText) {
            statusText.textContent = message;
            statusText.classList.add('error');
        }
    }
}

// Initialize framework when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.memoryFramework = new MemoryFramework();
});
