import { Canvas } from './components/Canvas.js';
import { AnalyticsDashboard } from './components/AnalyticsDashboard.js';
import { SupabaseAPI } from './api/supabaseApi.js';

// Memory UI Application
class MemoryUI {
    constructor() {
        this.entities = [];
        this.relations = [];
        this.selectedEntity = null;
        this.currentFilter = 'all';
        this.canvas = null;
        this.analyticsDashboard = null;
        
        this.init();
    }

    init() {
        this.initializeAPI();
        this.bindEvents();
        this.setupRealtimeEvents();
        this.initializeAnalytics();
        
        // Wait for API to be properly initialized before loading data
        const checkAndLoad = () => {
            if (window.memoryAPI && (window.memoryAPI.fetchAllEntities || window.memoryAPI.getEntities)) {
                this.loadData();
            } else {
                // Keep checking every 50ms up to 2 seconds
                if (this.apiCheckAttempts < 40) {
                    this.apiCheckAttempts = (this.apiCheckAttempts || 0) + 1;
                    setTimeout(checkAndLoad, 50);
                } else {
                    console.error('Failed to initialize API after 2 seconds');
                    this.showNotification('Failed to initialize API', 'error');
                }
            }
        };
        
        checkAndLoad();
    }

    // Initialize the appropriate API based on environment
    initializeAPI() {
        const isProduction = window.location.hostname.includes('railway.app') || window.location.hostname.includes('.up.railway.app');
        const useSupabase = isProduction || window.location.search.includes('api=supabase');
        
        if (useSupabase) {
            console.log('🔄 Using Supabase API for production environment');
            // Wait for supabaseAPI to be available, then assign it
            if (window.supabaseAPI) {
                window.memoryAPI = window.supabaseAPI;
            } else {
                // Wait for the module to load
                setTimeout(() => {
                    if (window.supabaseAPI) {
                        window.memoryAPI = window.supabaseAPI;
                    }
                }, 50);
            }
            
            // Add indicator
            const indicator = document.createElement('div');
            indicator.style.cssText = 'position: fixed; top: 10px; right: 10px; background: #059669; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; z-index: 1000;';
            indicator.textContent = '🗄️ Supabase';
            document.body.appendChild(indicator);
        } else {
            console.log('🔄 Using Railway API for development environment');
            // memoryAPI will be loaded from memoryApiV2.js
            
            // Add indicator
            const indicator = document.createElement('div');
            indicator.style.cssText = 'position: fixed; top: 10px; right: 10px; background: #7c3aed; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; z-index: 1000;';
            indicator.textContent = '🚂 Railway';
            document.body.appendChild(indicator);
        }
    }

    bindEvents() {
        // Header buttons
        document.getElementById('addEntityBtn').addEventListener('click', () => this.showAddEntityModal());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportData());
        
        // API version toggle
        const apiBtn = document.getElementById('apiVersionBtn');
        if (apiBtn) {
            apiBtn.addEventListener('click', () => this.toggleApiVersion());
        }

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
        
        // Quick capture input
        const quickInput = document.getElementById('quickCaptureInput');
        if (quickInput) {
            quickInput.addEventListener('input', (e) => this.updateQuickCapturePreview(e.target.value));
            quickInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.processQuickCapture();
                }
            });
        }
    }

    setupRealtimeEvents() {
        // Set up WebSocket event listeners for real-time updates
        if (window.memoryAPI && window.memoryAPI.on) {
            // Connection status events
            window.memoryAPI.on('connection:status', (data) => {
                if (data.connected) {
                    this.showNotification('🔗 Real-time updates connected', 'success');
                    this.updateConnectionIndicator(true);
                } else {
                    this.showNotification('🔗 Real-time updates disconnected', 'info');
                    this.updateConnectionIndicator(false);
                }
            });

            window.memoryAPI.on('connection:error', (data) => {
                console.warn('WebSocket connection error:', data);
                if (data.attempts < 3) {
                    this.showNotification(`Connection issues (attempt ${data.attempts})`, 'error');
                }
            });

            // Entity events
            window.memoryAPI.on('entity:created', (data) => {
                if (data.source !== 'local') {
                    this.handleRemoteEntityCreated(data);
                }
            });

            window.memoryAPI.on('entity:updated', (data) => {
                if (data.source !== 'local') {
                    this.handleRemoteEntityUpdated(data);
                }
            });

            window.memoryAPI.on('entity:deleted', (data) => {
                if (data.source !== 'local') {
                    this.handleRemoteEntityDeleted(data);
                }
            });

            // Relation events
            window.memoryAPI.on('relation:created', (data) => {
                if (data.source !== 'local') {
                    this.handleRemoteRelationCreated(data);
                }
            });

            window.memoryAPI.on('relation:deleted', (data) => {
                if (data.source !== 'local') {
                    this.handleRemoteRelationDeleted(data);
                }
            });

            // Observation events
            window.memoryAPI.on('observation:created', (data) => {
                if (data.source !== 'local') {
                    this.handleRemoteObservationCreated(data);
                }
            });
        }
    }

    async loadData() {
        try {
            // Wait a bit for API to be available, then check
            let attempts = 0;
            while (!window.memoryAPI && attempts < 10) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            // Check if memoryAPI is available
            if (!window.memoryAPI) {
                throw new Error('memoryAPI not available after waiting');
            }
            
            console.log('📊 Loading data using:', window.memoryAPI.constructor.name || 'Unknown API');
            
            this.showLoading();
            
            // Check if backend is available
            await window.memoryAPI.checkHealth();
            
            // Check which API we're using and call the appropriate method
            let data;
            if (window.memoryAPI.fetchMemory) {
                // SupabaseAPI
                data = await window.memoryAPI.fetchMemory();
            } else if (window.memoryAPI.getMemory) {
                // MemoryAPIV2
                data = await window.memoryAPI.getMemory();
            } else {
                throw new Error('No valid data fetching method found');
            }
            
            this.entities = data.entities || [];
            this.relations = data.relations || [];
            
            this.renderEntities();
            this.renderGraph();
            this.hideLoading();
            
            this.showNotification(`Loaded ${this.entities.length} entities and ${this.relations.length} relations`, 'success');
            
            // Track memory growth for analytics
            if (this.analyticsDashboard && window.memoryAPI.apiVersion === 'v2') {
                const observationCount = this.entities.reduce((sum, entity) => 
                    sum + (entity.observations?.length || 0), 0);
                    
                // This would normally be called from the backend, but we can estimate here
                if (window.analyticsService) {
                    window.analyticsService.trackMemoryGrowth(
                        this.entities.length,
                        this.relations.length,
                        observationCount
                    );
                }
            }
            
        } catch (error) {
            console.error('Failed to load data:', error);
            this.showNotification(`Failed to connect to backend: ${error.message}. Using offline mode.`, 'error');
            this.hideLoading();
            
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
            <div class="entity-item ${entity._isOptimistic ? 'optimistic' : ''}" data-entity="${entity.name}">
                <div class="entity-name">${entity.name}</div>
                <div class="entity-type">${entity.entityType}</div>
                <div class="entity-observations">${entity.observations.slice(0, 2).join('. ')}</div>
                ${entity._isOptimistic ? '<div class="optimistic-indicator" style="position: absolute; top: 4px; right: 4px; width: 8px; height: 8px; background: #58a6ff; border-radius: 50%; animation: pulse 1s infinite;"></div>' : ''}
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
            observations: observations ? observations.split('\n').filter(obs => obs.trim()) : [],
            _isOptimistic: true // Mark as optimistic update
        };

        // Optimistic update - update UI immediately
        this.entities.push(newEntity);
        this.renderEntities();
        this.renderGraph();
        this.hideAddEntityModal();
        this.showNotification('Creating entity...', 'info');

        try {
            // Save to backend
            const result = await window.memoryAPI.createEntity(newEntity);
            
            // Update with real data from server
            const createdEntity = result.created[0];
            const index = this.entities.findIndex(e => e.name === name);
            if (index !== -1) {
                this.entities[index] = { ...createdEntity, _isOptimistic: false };
            }
            
            this.showNotification('Entity created successfully', 'success');
            
        } catch (error) {
            console.error('Failed to create entity:', error);
            
            // Rollback optimistic update
            this.entities = this.entities.filter(e => e.name !== name);
            this.renderEntities();
            this.renderGraph();
            
            this.showNotification(error.message || 'Failed to save entity', 'error');
        }
    }

    editEntity(entityName) {
        const entity = this.entities.find(e => e.name === entityName);
        if (!entity) return;

        // Create edit modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Edit Entity</h3>
                <div class="form-group">
                    <label>Name</label>
                    <input type="text" id="editEntityName" value="${entity.name}" style="width: 100%;">
                </div>
                <div class="form-group">
                    <label>Type</label>
                    <select id="editEntityType" style="width: 100%;">
                        <option value="person" ${entity.entityType === 'person' ? 'selected' : ''}>Person</option>
                        <option value="concept" ${entity.entityType === 'concept' ? 'selected' : ''}>Concept</option>
                        <option value="event" ${entity.entityType === 'event' ? 'selected' : ''}>Event</option>
                        <option value="task" ${entity.entityType === 'task' ? 'selected' : ''}>Task</option>
                        <option value="other" ${entity.entityType === 'other' ? 'selected' : ''}>Other</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Observations</label>
                    <textarea id="editObservations" rows="4" style="width: 100%;">${entity.observations.join('\n')}</textarea>
                </div>
                <div class="modal-actions">
                    <button class="btn-secondary" onclick="window.memoryUI.cancelEdit()">Cancel</button>
                    <button class="btn-primary" onclick="window.memoryUI.saveEntityEdit('${entityName}')">Save</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.style.display = 'flex';
    }

    cancelEdit() {
        const modal = document.querySelector('.modal');
        if (modal) modal.remove();
    }

    async saveEntityEdit(originalName) {
        const newName = document.getElementById('editEntityName').value.trim();
        const newType = document.getElementById('editEntityType').value;
        const newObservations = document.getElementById('editObservations').value
            .split('\n')
            .map(o => o.trim())
            .filter(o => o);

        if (!newName) {
            this.showNotification('Name cannot be empty', 'error');
            return;
        }

        try {
            // Find the entity
            const entity = this.entities.find(e => e.name === originalName);
            if (!entity) return;

            // Update via API (using entity ID if available)
            const entityId = entity.id || originalName;
            await window.memoryAPI.updateEntity(entityId, {
                name: newName,
                entityType: newType,
                observations: newObservations
            });

            // Update local state
            entity.name = newName;
            entity.entityType = newType;
            entity.observations = newObservations;

            // Update relations if name changed
            if (originalName !== newName) {
                this.relations.forEach(rel => {
                    if (rel.from === originalName) rel.from = newName;
                    if (rel.to === originalName) rel.to = newName;
                });
            }

            // Update UI
            this.renderEntities();
            this.renderGraph();
            if (this.selectedEntity && this.selectedEntity.name === originalName) {
                this.selectedEntity.name = newName;
                this.showDetailPanel();
            }

            this.cancelEdit();
            this.showNotification('Entity updated successfully', 'success');
        } catch (error) {
            console.error('Failed to update entity:', error);
            this.showNotification(error.message || 'Failed to update entity', 'error');
        }
    }

    async deleteEntity(entityName) {
        if (confirm(`Are you sure you want to delete "${entityName}"?`)) {
            // Store backup for rollback
            const entityBackup = this.entities.find(e => e.name === entityName);
            const relationsBackup = this.relations.filter(r => r.from === entityName || r.to === entityName);
            
            // Optimistic update - remove immediately from UI
            this.entities = this.entities.filter(e => e.name !== entityName);
            this.relations = this.relations.filter(r => r.from !== entityName && r.to !== entityName);
            this.hideDetailPanel();
            this.renderEntities();
            this.renderGraph();
            this.showNotification('Deleting entity...', 'info');
            
            try {
                // Delete from backend
                await window.memoryAPI.deleteEntity(entityName);
                this.showNotification('Entity deleted successfully', 'success');
                
            } catch (error) {
                console.error('Failed to delete entity:', error);
                
                // Rollback optimistic update
                if (entityBackup) {
                    this.entities.push(entityBackup);
                }
                this.relations.push(...relationsBackup);
                this.renderEntities();
                this.renderGraph();
                
                this.showNotification(error.message || 'Failed to delete entity', 'error');
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
        // Quick capture overlay shortcuts
        const overlay = document.getElementById('quickCaptureOverlay');
        if (overlay && overlay.classList.contains('active')) {
            if (e.key === 'Escape') {
                e.preventDefault();
                this.hideQuickCapture();
            }
            return;
        }
        
        // Keyboard shortcuts
        if (e.metaKey || e.ctrlKey) {
            switch (e.key) {
                case 'k':
                    e.preventDefault();
                    this.showQuickCapture();
                    break;
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

    // Real-time event handlers
    handleRemoteEntityCreated(data) {
        const entity = data.entity;
        const v1Entity = window.memoryAPI.convertV2EntityToV1(entity);
        
        // Check if entity already exists (avoid duplicates)
        if (!this.entities.find(e => e.name === v1Entity.name)) {
            this.entities.push(v1Entity);
            this.renderEntities();
            this.renderGraph();
            this.showNotification(`📝 "${v1Entity.name}" created by another user`, 'info');
        }
    }

    handleRemoteEntityUpdated(data) {
        const entity = data.entity;
        const v1Entity = window.memoryAPI.convertV2EntityToV1(entity);
        
        const index = this.entities.findIndex(e => e.name === v1Entity.name || (e._v2 && e._v2.id === entity.id));
        if (index !== -1) {
            this.entities[index] = v1Entity;
            this.renderEntities();
            this.renderGraph();
            
            // Update detail panel if this entity is selected
            if (this.selectedEntity && (this.selectedEntity.name === v1Entity.name || 
                (this.selectedEntity._v2 && this.selectedEntity._v2.id === entity.id))) {
                this.selectedEntity = v1Entity;
                this.showDetailPanel();
            }
            
            this.showNotification(`✏️ "${v1Entity.name}" updated by another user`, 'info');
        }
    }

    handleRemoteEntityDeleted(data) {
        const entityName = data.entity.name;
        const entityId = data.entity.id;
        
        // Remove entity from local data
        const entityIndex = this.entities.findIndex(e => 
            e.name === entityName || (e._v2 && e._v2.id === entityId)
        );
        
        if (entityIndex !== -1) {
            this.entities.splice(entityIndex, 1);
            
            // Remove related relations
            this.relations = this.relations.filter(r => 
                r.from !== entityName && r.to !== entityName
            );
            
            // Hide detail panel if deleted entity was selected
            if (this.selectedEntity && 
                (this.selectedEntity.name === entityName || 
                 (this.selectedEntity._v2 && this.selectedEntity._v2.id === entityId))) {
                this.hideDetailPanel();
            }
            
            this.renderEntities();
            this.renderGraph();
            this.showNotification(`🗑️ "${entityName}" deleted by another user`, 'info');
        }
    }

    handleRemoteRelationCreated(data) {
        const relation = data.relation;
        const v1Relation = window.memoryAPI.convertV2RelationToV1(relation);
        
        // Check if relation already exists (avoid duplicates)
        const exists = this.relations.find(r => 
            r.from === v1Relation.from && 
            r.to === v1Relation.to && 
            r.relationType === v1Relation.relationType
        );
        
        if (!exists) {
            this.relations.push(v1Relation);
            this.renderGraph();
            
            // Update detail panel if it shows one of the related entities
            if (this.selectedEntity && 
                (this.selectedEntity.name === v1Relation.from || 
                 this.selectedEntity.name === v1Relation.to)) {
                this.showDetailPanel();
            }
            
            this.showNotification(`🔗 New relation created by another user`, 'info');
        }
    }

    handleRemoteRelationDeleted(data) {
        const relation = data.relation;
        
        // Find and remove the relation
        const relationIndex = this.relations.findIndex(r => 
            (r._v2 && r._v2.id === relation.id) ||
            (r.from === relation.from_name && r.to === relation.to_name && r.relationType === relation.type)
        );
        
        if (relationIndex !== -1) {
            this.relations.splice(relationIndex, 1);
            this.renderGraph();
            
            // Update detail panel if it shows one of the related entities
            if (this.selectedEntity && 
                (this.selectedEntity.name === relation.from_name || 
                 this.selectedEntity.name === relation.to_name)) {
                this.showDetailPanel();
            }
            
            this.showNotification(`🔗 Relation removed by another user`, 'info');
        }
    }

    handleRemoteObservationCreated(data) {
        const entityId = data.entityId;
        const observation = data.observation;
        
        // Find the entity and add the observation
        const entity = this.entities.find(e => e._v2 && e._v2.id === entityId);
        if (entity) {
            if (!entity.observations) {
                entity.observations = [];
            }
            entity.observations.push(observation.content);
            
            // Update detail panel if this entity is selected
            if (this.selectedEntity && this.selectedEntity._v2 && this.selectedEntity._v2.id === entityId) {
                this.showDetailPanel();
            }
            
            this.showNotification(`📊 New observation added to "${entity.name}"`, 'info');
        }
    }

    updateConnectionIndicator(connected) {
        // Add connection status indicator to the UI
        let indicator = document.getElementById('connectionIndicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'connectionIndicator';
            indicator.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                width: 12px;
                height: 12px;
                border-radius: 50%;
                z-index: 2000;
                transition: background-color 0.3s ease;
            `;
            document.body.appendChild(indicator);
        }
        
        indicator.style.backgroundColor = connected ? '#51cf66' : '#ff6b6b';
        indicator.title = connected ? 'Real-time updates connected' : 'Real-time updates disconnected';
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
    
    showLoading() {
        // Create loading overlay if it doesn't exist
        let loadingOverlay = document.getElementById('loadingOverlay');
        if (!loadingOverlay) {
            loadingOverlay = document.createElement('div');
            loadingOverlay.id = 'loadingOverlay';
            loadingOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
            `;
            loadingOverlay.innerHTML = `
                <div style="color: white; font-size: 18px;">
                    Loading...
                </div>
            `;
            document.body.appendChild(loadingOverlay);
        }
        loadingOverlay.style.display = 'flex';
    }
    
    hideLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }

    async toggleApiVersion() {
        const currentVersion = window.memoryAPI.apiVersion;
        const newVersion = currentVersion === 'v1' ? 'v2' : 'v1';
        
        // Update API version
        window.memoryAPI.setApiVersion(newVersion);
        
        // Update button text
        const apiBtn = document.getElementById('apiVersionBtn');
        if (apiBtn) {
            apiBtn.textContent = newVersion;
            apiBtn.style.color = newVersion === 'v2' ? '#51cf66' : '#58a6ff';
        }
        
        // Show notification
        this.showNotification(`Switched to API ${newVersion}`, 'info');
        
        // Reload data with new API
        await this.loadData();
        
        // If v2, show stats
        if (newVersion === 'v2') {
            try {
                const stats = await window.memoryAPI.getStats();
                console.log('📊 Database stats:', stats);
                this.showNotification(
                    `Loaded ${stats.entities.total} entities, ${stats.relations.total} relations`, 
                    'success'
                );
            } catch (error) {
                console.error('Failed to get stats:', error);
            }
        }
    }

    initializeAnalytics() {
        this.analyticsDashboard = new AnalyticsDashboard();
    }

    toggleAnalytics() {
        if (this.analyticsDashboard) {
            this.analyticsDashboard.toggle();
        }
    }

    
    // Quick Capture Methods
    showQuickCapture() {
        const overlay = document.getElementById('quickCaptureOverlay');
        const input = document.getElementById('quickCaptureInput');
        
        if (overlay) {
            overlay.classList.add('active');
            if (input) {
                input.value = '';
                input.focus();
                this.updateQuickCapturePreview('');
            }
        }
    }
    
    hideQuickCapture() {
        const overlay = document.getElementById('quickCaptureOverlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    }
    
    updateQuickCapturePreview(text) {
        const previewSection = document.getElementById('previewSection');
        const previewContent = document.getElementById('previewContent');
        
        if (!text.trim()) {
            previewSection.style.display = 'none';
            return;
        }
        
        const parsed = this.parseNaturalLanguage(text);
        
        if (parsed.entities.length > 0 || parsed.relations.length > 0) {
            previewSection.style.display = 'block';
            
            let html = '';
            
            // Show entities
            parsed.entities.forEach(entity => {
                html += `<div class="preview-item">
                    <span class="type">${entity.type}</span>
                    <span>${entity.name}</span>
                    ${entity.observations.length > 0 ? `<span style="color: #8b949e;">(${entity.observations.join(', ')})</span>` : ''}
                </div>`;
            });
            
            // Show relations
            parsed.relations.forEach(rel => {
                html += `<div class="preview-item">
                    <span class="type">relation</span>
                    <span>${rel.from} → ${rel.type} → ${rel.to}</span>
                </div>`;
            });
            
            previewContent.innerHTML = html;
        } else {
            previewSection.style.display = 'none';
        }
    }
    
    parseNaturalLanguage(text) {
        const entities = [];
        const relations = [];
        
        // Pattern: "X works at Y" or "X works for Y"
        const workPattern = /(\w+(?:\s+\w+)*)\s+works?\s+(?:at|for)\s+(\w+(?:\s+\w+)*)/i;
        const workMatch = text.match(workPattern);
        if (workMatch) {
            entities.push({
                name: workMatch[1],
                type: 'person',
                observations: []
            });
            entities.push({
                name: workMatch[2],
                type: 'organization',
                observations: []
            });
            relations.push({
                from: workMatch[1],
                to: workMatch[2],
                type: 'works at'
            });
        }
        
        // Pattern: "meeting with X about Y"
        const meetingPattern = /meeting\s+with\s+(\w+(?:\s+\w+)*)\s+about\s+(.+)/i;
        const meetingMatch = text.match(meetingPattern);
        if (meetingMatch) {
            entities.push({
                name: meetingMatch[1],
                type: 'person',
                observations: []
            });
            entities.push({
                name: meetingMatch[2],
                type: 'project',
                observations: []
            });
            relations.push({
                from: meetingMatch[1],
                to: meetingMatch[2],
                type: 'meeting about'
            });
        }
        
        // Pattern: "learned about X" or "learned that X"
        const learnedPattern = /learned\s+(?:about|that)\s+(.+)/i;
        const learnedMatch = text.match(learnedPattern);
        if (learnedMatch && !workMatch && !meetingMatch) {
            entities.push({
                name: learnedMatch[1].split(' ').slice(0, 3).join(' '),
                type: 'concept',
                observations: [learnedMatch[1]]
            });
        }
        
        // Pattern: "X is Y" (simple fact)
        const isPattern = /(\w+(?:\s+\w+)*)\s+is\s+(.+)/i;
        const isMatch = text.match(isPattern);
        if (isMatch && !workMatch && !meetingMatch && !learnedMatch) {
            entities.push({
                name: isMatch[1],
                type: 'concept',
                observations: [isMatch[2]]
            });
        }
        
        // If no patterns match, create a simple entity
        if (entities.length === 0 && text.trim().length > 0) {
            entities.push({
                name: text.trim(),
                type: 'concept',
                observations: []
            });
        }
        
        return { entities, relations };
    }
    
    async processQuickCapture() {
        const input = document.getElementById('quickCaptureInput');
        const text = input.value.trim();
        
        if (!text) return;
        
        const parsed = this.parseNaturalLanguage(text);
        
        try {
            // Create entities first
            const createdEntities = {};
            for (const entity of parsed.entities) {
                const created = await window.memoryAPI.createEntity({
                    name: entity.name,
                    entityType: entity.type,
                    observations: entity.observations
                });
                createdEntities[entity.name] = created;
            }
            
            // Create relations
            for (const relation of parsed.relations) {
                await window.memoryAPI.createRelation({
                    from: relation.from,
                    to: relation.to,
                    relationType: relation.type
                });
            }
            
            // Reload data
            await this.loadData();
            
            // Hide quick capture
            this.hideQuickCapture();
            
            // Show success
            const entityCount = parsed.entities.length;
            const relationCount = parsed.relations.length;
            this.showNotification(
                `Created ${entityCount} ${entityCount === 1 ? 'entity' : 'entities'} and ${relationCount} ${relationCount === 1 ? 'relation' : 'relations'}`,
                'success'
            );
            
        } catch (error) {
            console.error('Failed to process quick capture:', error);
            this.showNotification('Failed to create memory', 'error');
        }
    }
}

// Initialize the application
let memoryUI;
document.addEventListener('DOMContentLoaded', () => {
    memoryUI = new MemoryUI();
    // Make memoryUI accessible globally for onclick handlers
    window.memoryUI = memoryUI;
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