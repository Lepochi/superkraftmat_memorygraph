/**
 * Analytics Dashboard Component
 * 
 * Real-time performance monitoring and visualization for the memory system
 */
export class AnalyticsDashboard {
    constructor() {
        this.container = null;
        this.charts = {};
        this.isVisible = false;
        this.updateInterval = null;
        this.websocket = null;
        
        // Analytics data
        this.systemMetrics = {};
        this.performanceData = [];
        this.semanticStats = {};
        this.memoryGrowth = [];
        
        this.init();
    }

    init() {
        this.createDashboard();
        this.setupWebSocketConnection();
        this.startRealTimeUpdates();
    }

    createDashboard() {
        // Create dashboard container
        const dashboard = document.createElement('div');
        dashboard.id = 'analyticsDashboard';
        dashboard.className = 'analytics-dashboard hidden';
        dashboard.innerHTML = `
            <div class="dashboard-header">
                <h2>📊 Performance Analytics</h2>
                <div class="dashboard-controls">
                    <button id="refreshBtn" class="btn btn-sm">🔄 Refresh</button>
                    <button id="exportBtn" class="btn btn-sm">📥 Export</button>
                    <button id="closeDashboardBtn" class="btn btn-sm">✕</button>
                </div>
            </div>
            
            <div class="dashboard-content">
                <!-- System Health Overview -->
                <div class="metrics-grid">
                    <div class="metric-card system-health">
                        <h3>System Health</h3>
                        <div class="health-indicator">
                            <div class="status-badge" id="healthStatus">Checking...</div>
                            <div class="uptime" id="systemUptime">Uptime: --</div>
                        </div>
                        <div class="health-details">
                            <div class="metric">
                                <span class="label">Memory Usage:</span>
                                <span class="value" id="memoryUsage">--</span>
                            </div>
                            <div class="metric">
                                <span class="label">Avg Query Time:</span>
                                <span class="value" id="avgQueryTime">--</span>
                            </div>
                            <div class="metric">
                                <span class="label">Event Loop Lag:</span>
                                <span class="value" id="eventLoopLag">--</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="metric-card performance-overview">
                        <h3>Performance Overview</h3>
                        <div class="performance-chart">
                            <canvas id="performanceChart" width="300" height="150"></canvas>
                        </div>
                        <div class="performance-stats">
                            <div class="stat">
                                <span class="label">Total Queries:</span>
                                <span class="value" id="totalQueries">--</span>
                            </div>
                            <div class="stat">
                                <span class="label">Semantic Searches:</span>
                                <span class="value" id="semanticSearches">--</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="metric-card memory-stats">
                        <h3>Memory Statistics</h3>
                        <div class="memory-chart">
                            <canvas id="memoryChart" width="300" height="150"></canvas>
                        </div>
                        <div class="memory-breakdown">
                            <div class="breakdown-item">
                                <span class="label">Entities:</span>
                                <span class="value" id="entityCount">--</span>
                            </div>
                            <div class="breakdown-item">
                                <span class="label">Relations:</span>
                                <span class="value" id="relationCount">--</span>
                            </div>
                            <div class="breakdown-item">
                                <span class="label">Observations:</span>
                                <span class="value" id="observationCount">--</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="metric-card semantic-analytics">
                        <h3>Semantic Search Analytics</h3>
                        <div class="semantic-stats">
                            <div class="stat-row">
                                <span class="label">Embedding Success Rate:</span>
                                <span class="value" id="embeddingSuccessRate">--</span>
                            </div>
                            <div class="stat-row">
                                <span class="label">Avg Embedding Time:</span>
                                <span class="value" id="avgEmbeddingTime">--</span>
                            </div>
                            <div class="stat-row">
                                <span class="label">Hybrid Search Usage:</span>
                                <span class="value" id="hybridSearchUsage">--</span>
                            </div>
                        </div>
                        <div class="search-patterns">
                            <h4>Search Patterns</h4>
                            <div id="searchPatterns" class="pattern-list">
                                Loading...
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Real-time Activity Feed -->
                <div class="activity-section">
                    <h3>Real-time Activity</h3>
                    <div class="activity-feed" id="activityFeed">
                        <div class="activity-item">
                            <span class="timestamp">Starting monitoring...</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(dashboard);
        this.container = dashboard;
        
        // Bind events
        this.bindEvents();
    }

    bindEvents() {
        document.getElementById('refreshBtn').addEventListener('click', () => this.refreshData());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportData());
        document.getElementById('closeDashboardBtn').addEventListener('click', () => this.hide());
    }

    setupWebSocketConnection() {
        // Connect to analytics WebSocket if available
        if (window.io && window.memoryAPI) {
            try {
                this.websocket = window.io();
                
                this.websocket.on('metrics:system', (data) => {
                    this.updateSystemMetrics(data);
                });
                
                this.websocket.on('metrics:query', (data) => {
                    this.addActivityItem(`Query: ${data.operation} (${data.duration.toFixed(2)}ms)`, 'query');
                });
                
                this.websocket.on('metrics:semantic', (data) => {
                    this.addActivityItem(`Search: ${data.searchType} - ${data.resultCount} results (${data.duration.toFixed(2)}ms)`, 'search');
                });
                
                this.websocket.on('metrics:embedding', (data) => {
                    this.addActivityItem(`Embedding: ${data.operation} (${data.duration.toFixed(2)}ms)`, 'embedding');
                });
                
            } catch (error) {
                console.warn('WebSocket connection failed for analytics:', error);
            }
        }
    }

    startRealTimeUpdates() {
        // Update dashboard every 5 seconds
        this.updateInterval = setInterval(() => {
            if (this.isVisible) {
                this.refreshData();
            }
        }, 5000);
        
        // Initial load
        this.refreshData();
    }

    async refreshData() {
        try {
            // Fetch analytics summary
            const response = await fetch('/api/v2/analytics/summary');
            const data = await response.json();
            
            if (data.success) {
                this.updateDashboard(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch analytics data:', error);
            this.addActivityItem('Failed to fetch analytics data', 'error');
        }
    }

    updateDashboard(analyticsData) {
        // Update system health
        this.updateSystemHealth(analyticsData.system);
        
        // Update performance metrics
        this.updatePerformanceMetrics(analyticsData.backend, analyticsData.performance);
        
        // Update memory statistics
        this.updateMemoryStats(analyticsData.memory);
        
        // Update semantic analytics
        this.updateSemanticAnalytics(analyticsData.semantic, analyticsData.patterns);
    }

    updateSystemHealth(systemData) {
        if (!systemData) return;
        
        // Health status
        const healthEl = document.getElementById('healthStatus');
        const memoryUsagePercent = systemData.memory ? 
            (systemData.memory.process.heapUsed / systemData.memory.process.heapTotal * 100) : 0;
        
        let status = 'healthy';
        let statusClass = 'status-healthy';
        
        if (memoryUsagePercent > 90) {
            status = 'critical';
            statusClass = 'status-critical';
        } else if (memoryUsagePercent > 80) {
            status = 'warning';
            statusClass = 'status-warning';
        }
        
        healthEl.textContent = status.toUpperCase();
        healthEl.className = `status-badge ${statusClass}`;
        
        // System uptime
        document.getElementById('systemUptime').textContent = 
            `Uptime: ${this.formatUptime(systemData.uptime)}`;
        
        // Memory usage
        document.getElementById('memoryUsage').textContent = 
            `${memoryUsagePercent.toFixed(1)}% (${this.formatBytes(systemData.memory?.process?.heapUsed || 0)})`;
    }

    updatePerformanceMetrics(backendData, performanceData) {
        // Average query time
        const avgQueryTime = performanceData?.avgQueryTime || 0;
        document.getElementById('avgQueryTime').textContent = `${avgQueryTime.toFixed(2)}ms`;
        
        // Total queries
        const totalQueries = Object.values(backendData || {}).reduce((sum, op) => sum + (op.count || 0), 0);
        document.getElementById('totalQueries').textContent = totalQueries.toLocaleString();
        
        // Update performance chart
        this.updatePerformanceChart(performanceData);
    }

    updateMemoryStats(memoryData) {
        if (!memoryData?.growth) return;
        
        const growth = memoryData.growth;
        document.getElementById('entityCount').textContent = growth.entities?.toLocaleString() || '--';
        document.getElementById('relationCount').textContent = growth.relations?.toLocaleString() || '--';
        document.getElementById('observationCount').textContent = growth.observations?.toLocaleString() || '--';
        
        // Update memory chart
        this.updateMemoryChart(growth);
    }

    updateSemanticAnalytics(semanticData, patterns) {
        // Embedding success rate
        const embeddingStats = semanticData?.embeddings;
        if (embeddingStats) {
            document.getElementById('embeddingSuccessRate').textContent = 
                `${embeddingStats.successRate?.toFixed(1) || 0}%`;
            document.getElementById('avgEmbeddingTime').textContent = 
                `${embeddingStats.avgTime?.toFixed(2) || 0}ms`;
        }
        
        // Search patterns
        const patternsEl = document.getElementById('searchPatterns');
        if (patterns?.searchPatterns) {
            patternsEl.innerHTML = Object.entries(patterns.searchPatterns)
                .map(([pattern, count]) => 
                    `<div class="pattern-item">
                        <span class="pattern-name">${pattern}</span>
                        <span class="pattern-count">${count}</span>
                    </div>`
                ).join('');
        }
        
        // Semantic searches count
        const semanticCount = Object.values(semanticData || {}).reduce((sum, type) => 
            sum + (type.count || 0), 0);
        document.getElementById('semanticSearches').textContent = semanticCount.toLocaleString();
    }

    updatePerformanceChart(performanceData) {
        // Simplified chart rendering - in production, you'd use Chart.js or similar
        const canvas = document.getElementById('performanceChart');
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw a simple line chart
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        const queries = performanceData?.recentQueries || [];
        if (queries.length > 1) {
            const maxTime = Math.max(...queries.map(q => q.duration));
            const step = canvas.width / queries.length;
            
            queries.forEach((query, index) => {
                const x = index * step;
                const y = canvas.height - (query.duration / maxTime * canvas.height);
                
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            
            ctx.stroke();
        }
    }

    updateMemoryChart(growthData) {
        const canvas = document.getElementById('memoryChart');
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw simple bar chart
        const total = (growthData.entities || 0) + (growthData.relations || 0) + (growthData.observations || 0);
        if (total > 0) {
            const entities = growthData.entities || 0;
            const relations = growthData.relations || 0;
            const observations = growthData.observations || 0;
            
            const entityHeight = (entities / total) * canvas.height;
            const relationHeight = (relations / total) * canvas.height;
            const observationHeight = (observations / total) * canvas.height;
            
            // Draw bars
            ctx.fillStyle = '#2196F3';
            ctx.fillRect(0, canvas.height - entityHeight, canvas.width / 3, entityHeight);
            
            ctx.fillStyle = '#FF9800';
            ctx.fillRect(canvas.width / 3, canvas.height - relationHeight, canvas.width / 3, relationHeight);
            
            ctx.fillStyle = '#4CAF50';
            ctx.fillRect(2 * canvas.width / 3, canvas.height - observationHeight, canvas.width / 3, observationHeight);
        }
    }

    addActivityItem(message, type = 'info') {
        const feed = document.getElementById('activityFeed');
        const item = document.createElement('div');
        item.className = `activity-item activity-${type}`;
        item.innerHTML = `
            <span class="timestamp">${new Date().toLocaleTimeString()}</span>
            <span class="message">${message}</span>
        `;
        
        feed.insertBefore(item, feed.firstChild);
        
        // Keep only last 20 items
        while (feed.children.length > 20) {
            feed.removeChild(feed.lastChild);
        }
    }

    updateSystemMetrics(data) {
        this.systemMetrics = data;
        
        // Update event loop lag if available
        if (data.eventLoopLag !== undefined) {
            document.getElementById('eventLoopLag').textContent = `${data.eventLoopLag.toFixed(2)}ms`;
        }
    }

    async exportData() {
        try {
            const response = await fetch('/api/v2/analytics/summary');
            const data = await response.json();
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `analytics-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            this.addActivityItem('Analytics data exported', 'success');
        } catch (error) {
            console.error('Export failed:', error);
            this.addActivityItem('Export failed', 'error');
        }
    }

    show() {
        this.isVisible = true;
        this.container.classList.remove('hidden');
        this.refreshData();
    }

    hide() {
        this.isVisible = false;
        this.container.classList.add('hidden');
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        if (this.websocket) {
            this.websocket.disconnect();
        }
        
        if (this.container) {
            this.container.remove();
        }
    }

    // Utility methods
    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    }

    formatBytes(bytes) {
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
    }
}