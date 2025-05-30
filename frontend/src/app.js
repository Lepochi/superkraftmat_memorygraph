import { Canvas } from './components/Canvas.js';

// Memory UI Application
class MemoryUI {
    constructor() {
        this.entities = [];
        this.relations = [];
        this.selectedEntity = null;
        this.currentFilter = 'all';
        this.canvas = null;
        
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

        // Sidebar toggle
        document.getElementById('sidebarToggle').addEventListener('click', () => this.toggleSidebar());
        
        // Detail panel toggle
        document.getElementById('detailToggle').addEventListener('click', () => this.toggleDetailPanel());

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
            await window.memoryAPI.checkHealth();
            
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
        const canvasContainer = document.getElementById('graphCanvas');
        
        if (!this.canvas) {
            this.canvas = new Canvas(canvasContainer);
            
            // Handle entity movement
            this.canvas.onEntityMoved = (entityName, position) => {
                // Save position to entity data
                const entity = this.entities.find(e => e.name === entityName);
                if (entity) {
                    entity.position = position;
                    // TODO: Persist to backend
                }
            };
        }
        
        // Clear existing entities
        this.canvas.clear();
        
        if (this.entities.length === 0) {
            canvasContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🧠</div>
                    <h3>Your Knowledge Graph</h3>
                    <p>Add entities to start building your memory network</p>
                </div>
            `;
            return;
        }

        // Add entities to canvas
        this.entities.forEach((entity, index) => {
            // Use saved position or calculate new position
            let position = entity.position;
            if (!position) {
                // Arrange in a circle for initial layout
                const angle = (index / this.entities.length) * Math.PI * 2;
                const radius = Math.min(300, this.entities.length * 30);
                position = {
                    x: 5000 + Math.cos(angle) * radius,
                    y: 5000 + Math.sin(angle) * radius
                };
            }
            
            const canvasEntity = this.canvas.addEntity(entity, position);
            
            // Handle entity selection
            canvasEntity.element.addEventListener('click', (e) => {
                if (!canvasEntity.isDragging && !e.target.classList.contains('connection-point')) {
                    this.selectEntity(entity.name);
                }
            });
        });

        // Add connections based on relations
        this.relations.forEach(relation => {
            this.canvas.addConnection(relation.from, relation.to, relation.relationType);
        });

        // Zoom to fit all entities
        setTimeout(() => {
            this.canvas.zoomToFit();
        }, 100);
    }

    selectEntity(entityName) {
        this.selectedEntity = this.entities.find(e => e.name === entityName);
        
        // Update selected state in entity list
        document.querySelectorAll('.entity-item').forEach(item => {
            item.classList.toggle('selected', item.dataset.entity === entityName);
        });

        // Update selected state in canvas
        if (this.canvas) {
            this.canvas.entities.forEach((entity, name) => {
                if (name === entityName) {
                    entity.element.classList.add('selected');
                    entity.element.style.boxShadow = '0 0 20px rgba(88, 166, 255, 0.6)';
                } else {
                    entity.element.classList.remove('selected');
                    entity.element.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
                }
            });
        }

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
        
        // Remove selection from canvas entities
        if (this.canvas) {
            this.canvas.entities.forEach((entity) => {
                entity.element.classList.remove('selected');
                entity.element.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
            });
        }
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
        if (this.canvas) {
            this.canvas.zoomToFit();
            this.showNotification('Graph centered', 'info');
        }
    }

    toggleFullscreen() {
        const mainPanel = document.querySelector('.main-panel');
        const isFullscreen = mainPanel.classList.contains('fullscreen');
        
        if (!isFullscreen) {
            mainPanel.classList.add('fullscreen');
            document.getElementById('fullscreenBtn').innerHTML = '<span class="icon">⛶</span>';
            this.showNotification('Entered fullscreen mode', 'info');
        } else {
            mainPanel.classList.remove('fullscreen');
            document.getElementById('fullscreenBtn').innerHTML = '<span class="icon">⛶</span>';
            this.showNotification('Exited fullscreen mode', 'info');
        }
    }
    
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const toggle = document.getElementById('sidebarToggle');
        const isCollapsed = sidebar.classList.contains('collapsed');
        
        if (isCollapsed) {
            sidebar.classList.remove('collapsed');
            toggle.innerHTML = '<span>‹</span>';
        } else {
            sidebar.classList.add('collapsed');
            toggle.innerHTML = '<span>›</span>';
        }
    }
    
    toggleDetailPanel() {
        const detailPanel = document.getElementById('detailPanel');
        const toggle = document.getElementById('detailToggle');
        const isCollapsed = detailPanel.classList.contains('collapsed');
        
        if (isCollapsed) {
            detailPanel.classList.remove('collapsed');
            toggle.innerHTML = '<span>›</span>';
        } else {
            detailPanel.classList.add('collapsed');
            toggle.innerHTML = '<span>‹</span>';
        }
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