// Memory UI Application
class MemoryUI {
    constructor() {
        this.entities = [];
        this.relations = [];
        this.selectedEntity = null;
        this.currentFilter = 'all';
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadData();
    }

    bindEvents() {
        // Header buttons
        document.getElementById('addEntityBtn').addEventListener('click', () => this.showAddEntityModal());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportData());

        // Modal events
        document.getElementById('closeAddModal').addEventListener('click', () => this.hideAddEntityModal());
        document.getElementById('cancelAddBtn').addEventListener('click', () => this.hideAddEntityModal());
        document.getElementById('confirmAddBtn').addEventListener('click', () => this.createEntity());

        // Search
        document.getElementById('searchInput').addEventListener('input', (e) => this.filterEntities(e.target.value));

        // Filter tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.setFilter(e.target.dataset.filter));
        });

        // Detail panel
        document.getElementById('closeDetailBtn').addEventListener('click', () => this.hideDetailPanel());

        // Graph controls
        document.getElementById('centerGraphBtn').addEventListener('click', () => this.centerGraph());
        document.getElementById('fullscreenBtn').addEventListener('click', () => this.toggleFullscreen());

        // Modal overlay click to close
        document.getElementById('addEntityModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.hideAddEntityModal();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    async loadData() {
        try {
            // Check if backend is available
            await window.memoryAPI.healthCheck();
            
            // Load actual memory data from backend
            const data = await window.memoryAPI.fetchMemory();
            
            this.entities = data.entities || [];
            this.relations = data.relations || [];
            
            this.renderEntities();
            this.renderGraph();
            
            this.showNotification(`Loaded ${this.entities.length} entities and ${this.relations.length} relations`, 'success');
            
        } catch (error) {
            console.error('Failed to load data:', error);
            this.showNotification('Failed to connect to backend. Using offline mode.', 'error');
            
            // Fallback to empty state
            this.entities = [];
            this.relations = [];
            this.renderEntities();
            this.renderGraph();
        }
    }

    renderEntities() {
        const container = document.getElementById('entityList');
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        
        let filteredEntities = this.entities.filter(entity => {
            const matchesSearch = !searchTerm || 
                entity.name.toLowerCase().includes(searchTerm) ||
                entity.entityType.toLowerCase().includes(searchTerm) ||
                entity.observations.some(obs => obs.toLowerCase().includes(searchTerm));
            
            const matchesFilter = this.currentFilter === 'all' || 
                entity.entityType === this.currentFilter;
            
            return matchesSearch && matchesFilter;
        });

        if (filteredEntities.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding: 40px 20px; text-align: center;">
                    <div class="empty-icon">🔍</div>
                    <p>No entities found</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredEntities.map(entity => `
            <div class="entity-item" data-entity="${entity.name}">
                <div class="entity-name">${entity.name}</div>
                <div class="entity-type">${entity.entityType}</div>
                <div class="entity-observations">${entity.observations.slice(0, 2).join('. ')}</div>
            </div>
        `).join('');

        // Add click events
        container.querySelectorAll('.entity-item').forEach(item => {
            item.addEventListener('click', () => this.selectEntity(item.dataset.entity));
        });
    }

    renderGraph() {
        const canvas = document.getElementById('graphCanvas');
        
        if (this.entities.length === 0) {
            canvas.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🧠</div>
                    <h3>Your Knowledge Graph</h3>
                    <p>Add entities to start building your memory network</p>
                </div>
            `;
            return;
        }

        // Simple graph visualization
        const graphContainer = document.createElement('div');
        graphContainer.className = 'graph-visualization';
        graphContainer.style.cssText = `
            position: relative;
            width: 100%;
            height: 100%;
            padding: 40px;
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            align-items: center;
            gap: 60px;
        `;

        this.entities.forEach((entity, index) => {
            const node = document.createElement('div');
            node.className = 'graph-node';
            node.dataset.entity = entity.name;
            node.style.cssText = `
                width: 120px;
                height: 80px;
                background: rgba(88, 166, 255, 0.1);
                border: 2px solid rgba(88, 166, 255, 0.3);
                border-radius: 12px;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                cursor: pointer;
                transition: all 0.3s ease;
                backdrop-filter: blur(8px);
                position: relative;
            `;

            node.innerHTML = `
                <div style="font-weight: 500; color: #f0f6fc; font-size: 12px; text-align: center; margin-bottom: 4px;">
                    ${entity.name}
                </div>
                <div style="font-size: 10px; color: #8b949e; text-transform: capitalize;">
                    ${entity.entityType}
                </div>
            `;

            node.addEventListener('click', () => this.selectEntity(entity.name));
            node.addEventListener('mouseenter', () => {
                node.style.background = 'rgba(88, 166, 255, 0.2)';
                node.style.borderColor = 'rgba(88, 166, 255, 0.6)';
                node.style.transform = 'scale(1.05)';
                node.style.boxShadow = '0 0 20px rgba(88, 166, 255, 0.3)';
            });
            node.addEventListener('mouseleave', () => {
                node.style.background = 'rgba(88, 166, 255, 0.1)';
                node.style.borderColor = 'rgba(88, 166, 255, 0.3)';
                node.style.transform = 'scale(1)';
                node.style.boxShadow = 'none';
            });

            graphContainer.appendChild(node);
        });

        canvas.innerHTML = '';
        canvas.appendChild(graphContainer);
    }

    selectEntity(entityName) {
        this.selectedEntity = this.entities.find(e => e.name === entityName);
        
        // Update selected state in entity list
        document.querySelectorAll('.entity-item').forEach(item => {
            item.classList.toggle('selected', item.dataset.entity === entityName);
        });

        // Update selected state in graph
        document.querySelectorAll('.graph-node').forEach(node => {
            if (node.dataset.entity === entityName) {
                node.style.background = 'rgba(88, 166, 255, 0.3)';
                node.style.borderColor = '#58a6ff';
            } else {
                node.style.background = 'rgba(88, 166, 255, 0.1)';
                node.style.borderColor = 'rgba(88, 166, 255, 0.3)';
            }
        });

        this.showDetailPanel();
    }

    showDetailPanel() {
        if (!this.selectedEntity) return;

        const panel = document.getElementById('detailPanel');
        const title = document.getElementById('detailTitle');
        const content = document.getElementById('detailContent');

        title.textContent = this.selectedEntity.name;

        const relatedRelations = this.relations.filter(r => 
            r.from === this.selectedEntity.name || r.to === this.selectedEntity.name
        );

        content.innerHTML = `
            <div class="detail-section">
                <h4 style="color: #f0f6fc; margin-bottom: 8px; font-size: 14px;">Type</h4>
                <p style="color: #8b949e; text-transform: capitalize; margin-bottom: 16px;">${this.selectedEntity.entityType}</p>
            </div>
            
            <div class="detail-section">
                <h4 style="color: #f0f6fc; margin-bottom: 8px; font-size: 14px;">Observations</h4>
                <div style="margin-bottom: 16px;">
                    ${this.selectedEntity.observations.map(obs => `
                        <div style="background: rgba(33, 38, 45, 0.5); padding: 8px 12px; border-radius: 6px; margin-bottom: 6px; color: #8b949e; font-size: 13px;">
                            ${obs}
                        </div>
                    `).join('')}
                </div>
            </div>

            ${relatedRelations.length > 0 ? `
                <div class="detail-section">
                    <h4 style="color: #f0f6fc; margin-bottom: 8px; font-size: 14px;">Relations</h4>
                    <div>
                        ${relatedRelations.map(rel => `
                            <div style="background: rgba(33, 38, 45, 0.5); padding: 8px 12px; border-radius: 6px; margin-bottom: 6px; color: #8b949e; font-size: 13px;">
                                ${rel.from === this.selectedEntity.name ? 
                                    `→ ${rel.relationType} → ${rel.to}` :
                                    `← ${rel.relationType} ← ${rel.from}`
                                }
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <div class="detail-actions" style="margin-top: 20px; display: flex; gap: 8px;">
                <button class="btn-secondary" style="flex: 1;" onclick="memoryUI.editEntity('${this.selectedEntity.name}')">
                    Edit
                </button>
                <button class="btn-secondary" style="color: #ff6b6b; border-color: rgba(255, 107, 107, 0.3);" onclick="memoryUI.deleteEntity('${this.selectedEntity.name}')">
                    Delete
                </button>
            </div>
        `;
    }

    hideDetailPanel() {
        this.selectedEntity = null;
        document.querySelectorAll('.entity-item').forEach(item => item.classList.remove('selected'));
        document.querySelectorAll('.graph-node').forEach(node => {
            node.style.background = 'rgba(88, 166, 255, 0.1)';
            node.style.borderColor = 'rgba(88, 166, 255, 0.3)';
        });
    }

    setFilter(filter) {
        this.currentFilter = filter;
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        this.renderEntities();
    }

    filterEntities(searchTerm) {
        this.renderEntities();
    }

    showAddEntityModal() {
        document.getElementById('addEntityModal').classList.add('show');
        document.getElementById('entityName').focus();
    }

    hideAddEntityModal() {
        document.getElementById('addEntityModal').classList.remove('show');
        // Clear form
        document.getElementById('entityName').value = '';
        document.getElementById('entityType').value = 'person';
        document.getElementById('entityObservations').value = '';
    }

    async createEntity() {
        const name = document.getElementById('entityName').value.trim();
        const type = document.getElementById('entityType').value;
        const observations = document.getElementById('entityObservations').value.trim();

        if (!name) {
            this.showNotification('Please enter an entity name', 'error');
            return;
        }

        if (this.entities.find(e => e.name === name)) {
            this.showNotification('Entity with this name already exists', 'error');
            return;
        }

        const newEntity = {
            name,
            entityType: type,
            observations: observations ? observations.split('\n').filter(obs => obs.trim()) : []
        };

        try {
            // Save to backend
            await window.memoryAPI.createEntity(newEntity);
            
            // Update local state
            this.entities.push(newEntity);
            this.renderEntities();
            this.renderGraph();
            this.hideAddEntityModal();
            this.showNotification('Entity created and saved successfully', 'success');
            
        } catch (error) {
            console.error('Failed to create entity:', error);
            this.showNotification('Failed to save entity to backend', 'error');
        }
    }

    editEntity(entityName) {
        // TODO: Implement edit functionality
        this.showNotification('Edit functionality coming soon', 'info');
    }

    async deleteEntity(entityName) {
        if (confirm(`Are you sure you want to delete "${entityName}"?`)) {
            try {
                // Delete from backend
                await window.memoryAPI.deleteEntity(entityName);
                
                // Update local state
                this.entities = this.entities.filter(e => e.name !== entityName);
                this.relations = this.relations.filter(r => r.from !== entityName && r.to !== entityName);
                this.hideDetailPanel();
                this.renderEntities();
                this.renderGraph();
                this.showNotification('Entity deleted successfully', 'success');
                
            } catch (error) {
                console.error('Failed to delete entity:', error);
                this.showNotification('Failed to delete entity from backend', 'error');
            }
        }
    }

    centerGraph() {
        // TODO: Implement graph centering
        this.showNotification('Graph centered', 'info');
    }

    toggleFullscreen() {
        // TODO: Implement fullscreen toggle
        this.showNotification('Fullscreen toggle coming soon', 'info');
    }

    exportData() {
        const data = {
            entities: this.entities,
            relations: this.relations,
            exportedAt: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'memory-export.json';
        a.click();
        URL.revokeObjectURL(url);

        this.showNotification('Data exported successfully', 'success');
    }

    handleKeyboard(e) {
        // Keyboard shortcuts
        if (e.metaKey || e.ctrlKey) {
            switch (e.key) {
                case 'n':
                    e.preventDefault();
                    this.showAddEntityModal();
                    break;
                case 'e':
                    e.preventDefault();
                    this.exportData();
                    break;
                case 'f':
                    e.preventDefault();
                    document.getElementById('searchInput').focus();
                    break;
            }
        }

        if (e.key === 'Escape') {
            this.hideAddEntityModal();
            this.hideDetailPanel();
        }
    }

    showNotification(message, type = 'info') {
        // Simple notification system
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: ${type === 'error' ? '#ff6b6b' : type === 'success' ? '#51cf66' : '#58a6ff'};
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            z-index: 3000;
            font-size: 14px;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize the application
let memoryUI;
document.addEventListener('DOMContentLoaded', () => {
    memoryUI = new MemoryUI();
});

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);