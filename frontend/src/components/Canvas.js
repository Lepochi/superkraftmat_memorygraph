export class Canvas {
    constructor(container) {
        this.container = container;
        this.viewport = null;
        this.canvas = null;
        this.scale = 1;
        this.translate = { x: 0, y: 0 };
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.entities = new Map();
        this.connections = new Map();
        this.selectedEntity = null;
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.bindEvents();
    }
    
    setupCanvas() {
        this.container.innerHTML = '';
        this.container.style.position = 'relative';
        this.container.style.overflow = 'hidden';
        
        const viewportWrapper = document.createElement('div');
        viewportWrapper.className = 'canvas-viewport-wrapper';
        viewportWrapper.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            cursor: grab;
            user-select: none;
        `;
        
        this.viewport = document.createElement('div');
        this.viewport.className = 'canvas-viewport';
        this.viewport.style.cssText = `
            position: absolute;
            width: 100%;
            height: 100%;
            transform-origin: 0 0;
            transition: none;
            will-change: transform;
        `;
        
        this.canvas = document.createElement('div');
        this.canvas.className = 'canvas-content';
        this.canvas.style.cssText = `
            position: relative;
            width: 10000px;
            height: 10000px;
            background-image: 
                radial-gradient(circle, rgba(88, 166, 255, 0.1) 1px, transparent 1px),
                radial-gradient(circle, rgba(88, 166, 255, 0.05) 1px, transparent 1px);
            background-size: 20px 20px, 100px 100px;
            background-position: 0 0, 0 0;
        `;
        
        const svgLayer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svgLayer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1;
        `;
        svgLayer.id = 'connections-svg';
        
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        gradient.id = 'connectionGradient';
        gradient.innerHTML = `
            <stop offset="0%" stop-color="rgba(88, 166, 255, 0.6)" />
            <stop offset="100%" stop-color="rgba(88, 166, 255, 0.2)" />
        `;
        defs.appendChild(gradient);
        svgLayer.appendChild(defs);
        
        this.canvas.appendChild(svgLayer);
        this.viewport.appendChild(this.canvas);
        viewportWrapper.appendChild(this.viewport);
        this.container.appendChild(viewportWrapper);
        
        this.centerCanvas();
    }
    
    bindEvents() {
        this.container.addEventListener('wheel', (e) => this.handleZoom(e), { passive: false });
        this.container.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.container.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.container.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.container.addEventListener('mouseleave', (e) => this.handleMouseUp(e));
        
        document.addEventListener('keydown', (e) => {
            if (e.key === ' ' && e.target === document.body) {
                e.preventDefault();
                this.container.style.cursor = 'grab';
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (e.key === ' ') {
                this.container.style.cursor = 'default';
            }
        });
    }
    
    handleZoom(e) {
        e.preventDefault();
        
        // Use a smaller multiplier for smoother zooming
        const delta = e.deltaY * -0.0005;
        const newScale = Math.min(Math.max(0.2, this.scale + delta), 2);
        
        // Don't zoom if the change is too small (prevents jittery behavior)
        if (Math.abs(newScale - this.scale) < 0.001) return;
        
        const rect = this.container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const scaleChange = newScale / this.scale;
        
        this.translate.x = x - (x - this.translate.x) * scaleChange;
        this.translate.y = y - (y - this.translate.y) * scaleChange;
        
        this.scale = newScale;
        this.updateTransform();
    }
    
    handleMouseDown(e) {
        if (e.button !== 0) return;
        
        // Only start dragging if clicking on the canvas background, not on entities
        if ((e.target === this.container || e.target.closest('.canvas-viewport-wrapper')) 
            && !e.target.closest('.canvas-entity')) {
            e.preventDefault();
            this.isDragging = true;
            this.dragStart = {
                x: e.clientX - this.translate.x,
                y: e.clientY - this.translate.y
            };
            this.container.style.cursor = 'grabbing';
        }
    }
    
    handleMouseMove(e) {
        if (!this.isDragging) return;
        
        this.translate.x = e.clientX - this.dragStart.x;
        this.translate.y = e.clientY - this.dragStart.y;
        this.updateTransform();
    }
    
    handleMouseUp(e) {
        this.isDragging = false;
        this.container.style.cursor = 'grab';
    }
    
    updateTransform() {
        requestAnimationFrame(() => {
            this.viewport.style.transform = `translate(${this.translate.x}px, ${this.translate.y}px) scale(${this.scale})`;
        });
    }
    
    centerCanvas() {
        const rect = this.container.getBoundingClientRect();
        this.translate.x = rect.width / 2 - 5000;
        this.translate.y = rect.height / 2 - 5000;
        this.updateTransform();
    }
    
    addEntity(entityData, position = null) {
        const entity = new CanvasEntity(entityData, this);
        
        if (!position) {
            const rect = this.container.getBoundingClientRect();
            position = {
                x: (rect.width / 2 - this.translate.x) / this.scale,
                y: (rect.height / 2 - this.translate.y) / this.scale
            };
        }
        
        entity.setPosition(position.x, position.y);
        this.entities.set(entityData.name, entity);
        this.canvas.appendChild(entity.element);
        
        return entity;
    }
    
    removeEntity(entityName) {
        const entity = this.entities.get(entityName);
        if (entity) {
            entity.element.remove();
            this.entities.delete(entityName);
            
            const connectionsToRemove = [];
            this.connections.forEach((connection, key) => {
                if (connection.from === entityName || connection.to === entityName) {
                    connectionsToRemove.push(key);
                }
            });
            
            connectionsToRemove.forEach(key => {
                this.removeConnection(key);
            });
        }
    }
    
    addConnection(fromEntity, toEntity, relationType) {
        const key = `${fromEntity}-${toEntity}`;
        if (this.connections.has(key)) return;
        
        const connection = {
            from: fromEntity,
            to: toEntity,
            type: relationType,
            path: null
        };
        
        this.connections.set(key, connection);
        this.updateConnection(key);
    }
    
    removeConnection(key) {
        const connection = this.connections.get(key);
        if (connection && connection.path) {
            connection.path.remove();
        }
        this.connections.delete(key);
    }
    
    updateConnection(key) {
        const connection = this.connections.get(key);
        if (!connection) return;
        
        const fromEntity = this.entities.get(connection.from);
        const toEntity = this.entities.get(connection.to);
        
        if (!fromEntity || !toEntity) return;
        
        const svg = document.getElementById('connections-svg');
        
        if (connection.path) {
            connection.path.remove();
        }
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const fromPos = fromEntity.getConnectionPoint('output');
        const toPos = toEntity.getConnectionPoint('input');
        
        const midX = (fromPos.x + toPos.x) / 2;
        const d = `M ${fromPos.x} ${fromPos.y} C ${midX} ${fromPos.y}, ${midX} ${toPos.y}, ${toPos.x} ${toPos.y}`;
        
        path.setAttribute('d', d);
        path.setAttribute('stroke', 'url(#connectionGradient)');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('fill', 'none');
        path.style.filter = 'drop-shadow(0 0 4px rgba(88, 166, 255, 0.3))';
        
        svg.appendChild(path);
        connection.path = path;
    }
    
    updateAllConnections() {
        requestAnimationFrame(() => {
            this.connections.forEach((_, key) => {
                this.updateConnection(key);
            });
        });
    }
    
    
    clear() {
        this.entities.forEach(entity => {
            entity.element.remove();
        });
        this.entities.clear();
        
        this.connections.forEach(connection => {
            if (connection.path) {
                connection.path.remove();
            }
        });
        this.connections.clear();
    }
    
    zoomToFit() {
        if (this.entities.size === 0) {
            this.centerCanvas();
            return;
        }
        
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        this.entities.forEach(entity => {
            const pos = entity.getPosition();
            minX = Math.min(minX, pos.x);
            minY = Math.min(minY, pos.y);
            maxX = Math.max(maxX, pos.x + 200);
            maxY = Math.max(maxY, pos.y + 120);
        });
        
        const rect = this.container.getBoundingClientRect();
        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;
        
        const scaleX = (rect.width - 100) / contentWidth;
        const scaleY = (rect.height - 100) / contentHeight;
        this.scale = Math.min(Math.max(0.1, Math.min(scaleX, scaleY)), 1);
        
        this.translate.x = rect.width / 2 - (minX + contentWidth / 2) * this.scale;
        this.translate.y = rect.height / 2 - (minY + contentHeight / 2) * this.scale;
        
        this.updateTransform();
    }
}

class CanvasEntity {
    constructor(data, canvas) {
        this.data = data;
        this.canvas = canvas;
        this.element = null;
        this.position = { x: 0, y: 0 };
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        
        this.createElement();
        this.bindEvents();
    }
    
    createElement() {
        this.element = document.createElement('div');
        this.element.className = 'canvas-entity';
        this.element.dataset.entity = this.data.name;
        
        const typeColors = {
            person: { bg: 'rgba(88, 166, 255, 0.1)', border: 'rgba(88, 166, 255, 0.3)', glow: 'rgba(88, 166, 255, 0.4)' },
            company: { bg: 'rgba(255, 107, 107, 0.1)', border: 'rgba(255, 107, 107, 0.3)', glow: 'rgba(255, 107, 107, 0.4)' },
            project: { bg: 'rgba(81, 207, 102, 0.1)', border: 'rgba(81, 207, 102, 0.3)', glow: 'rgba(81, 207, 102, 0.4)' },
            system: { bg: 'rgba(255, 200, 87, 0.1)', border: 'rgba(255, 200, 87, 0.3)', glow: 'rgba(255, 200, 87, 0.4)' },
            other: { bg: 'rgba(163, 128, 255, 0.1)', border: 'rgba(163, 128, 255, 0.3)', glow: 'rgba(163, 128, 255, 0.4)' }
        };
        
        const colors = typeColors[this.data.entityType] || typeColors.other;
        
        this.element.style.cssText = `
            position: absolute;
            width: 220px;
            min-height: 80px;
            max-height: 140px;
            background: ${colors.bg};
            border: 2px solid ${colors.border};
            border-radius: 12px;
            padding: 16px;
            cursor: move;
            transition: all 0.2s ease;
            backdrop-filter: blur(8px);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            z-index: 10;
            user-select: none;
            overflow: hidden;
        `;
        
        this.element.innerHTML = `
            <div class="entity-header" style="margin-bottom: 8px;">
                <div style="font-weight: 600; color: #f0f6fc; font-size: 14px; margin-bottom: 4px; 
                     overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${this.data.name}
                </div>
                <div style="font-size: 11px; color: #8b949e; text-transform: capitalize;">
                    ${this.data.entityType}
                </div>
            </div>
            ${this.data.observations && this.data.observations.length > 0 ? `
                <div class="entity-preview" style="font-size: 11px; color: #8b949e; line-height: 1.4; 
                     max-height: 45px; overflow: hidden; text-overflow: ellipsis;
                     display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;">
                    ${this.data.observations[0]}
                </div>
            ` : ''}
            <div class="connection-point input" style="
                position: absolute;
                left: -6px;
                top: 50%;
                transform: translateY(-50%);
                width: 12px;
                height: 12px;
                background: ${colors.border};
                border: 2px solid #0d1117;
                border-radius: 50%;
                cursor: crosshair;
            "></div>
            <div class="connection-point output" style="
                position: absolute;
                right: -6px;
                top: 50%;
                transform: translateY(-50%);
                width: 12px;
                height: 12px;
                background: ${colors.border};
                border: 2px solid #0d1117;
                border-radius: 50%;
                cursor: crosshair;
            "></div>
        `;
        
        this.element.addEventListener('mouseenter', () => {
            this.element.style.transform = 'scale(1.02)';
            this.element.style.boxShadow = `0 4px 16px ${colors.glow}`;
            this.element.style.zIndex = '11';
        });
        
        this.element.addEventListener('mouseleave', () => {
            if (!this.isDragging) {
                this.element.style.transform = 'scale(1)';
                this.element.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
                this.element.style.zIndex = '10';
            }
        });
    }
    
    bindEvents() {
        this.element.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        // Mouse move and up are now handled in handleMouseDown for better control
    }
    
    handleMouseDown(e) {
        if (e.target.classList.contains('connection-point')) {
            return;
        }
        
        e.stopPropagation();
        e.preventDefault();
        this.isDragging = true;
        
        // Store the current position as the starting point
        this.dragOffset = {
            x: e.clientX,
            y: e.clientY
        };
        this.startPosition = { ...this.position };
        
        this.element.style.zIndex = '12';
        this.element.style.cursor = 'grabbing';
        this.element.style.transition = 'none'; // Disable transitions while dragging
        
        // Add window-level listeners for better dragging
        this.mouseMoveHandler = (e) => this.handleMouseMove(e);
        this.mouseUpHandler = (e) => this.handleMouseUp(e);
        window.addEventListener('mousemove', this.mouseMoveHandler);
        window.addEventListener('mouseup', this.mouseUpHandler);
    }
    
    handleMouseMove(e) {
        if (!this.isDragging) return;
        
        e.preventDefault();
        
        // Calculate the delta from the start position
        const deltaX = (e.clientX - this.dragOffset.x) / this.canvas.scale;
        const deltaY = (e.clientY - this.dragOffset.y) / this.canvas.scale;
        
        // Apply the delta to the start position
        const newX = this.startPosition.x + deltaX;
        const newY = this.startPosition.y + deltaY;
        
        this.setPosition(newX, newY);
        this.canvas.updateAllConnections();
    }
    
    handleMouseUp(e) {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        this.element.style.cursor = 'move';
        this.element.style.zIndex = '10';
        this.element.style.transition = ''; // Re-enable transitions
        
        // Remove window-level listeners
        if (this.mouseMoveHandler) {
            window.removeEventListener('mousemove', this.mouseMoveHandler);
            window.removeEventListener('mouseup', this.mouseUpHandler);
        }
        
        if (this.canvas.onEntityMoved) {
            this.canvas.onEntityMoved(this.data.name, this.position);
        }
    }
    
    setPosition(x, y) {
        this.position = { x, y };
        this.element.style.left = `${x}px`;
        this.element.style.top = `${y}px`;
    }
    
    getPosition() {
        return { ...this.position };
    }
    
    getConnectionPoint(type) {
        // Use position directly instead of getBoundingClientRect for more accurate positioning
        const elementWidth = 220; // Width of entity box
        const elementHeight = this.element.offsetHeight || 80;
        
        if (type === 'input') {
            return {
                x: this.position.x,
                y: this.position.y + elementHeight / 2
            };
        } else {
            return {
                x: this.position.x + elementWidth,
                y: this.position.y + elementHeight / 2
            };
        }
    }
}