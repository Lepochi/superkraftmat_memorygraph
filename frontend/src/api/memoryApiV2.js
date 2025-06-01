// Memory API Service v2
// Supports both v1 and v2 endpoints with automatic version switching

// Import Socket.io client
import { io } from 'socket.io-client';

class MemoryAPIV2 {
    constructor() {
        // Use relative URL for Vite proxy, or absolute URL for direct access
        this.baseURL = window.location.hostname === 'localhost' && window.location.port === '5173' 
            ? '/api'  // Use Vite proxy
            : 'http://localhost:8000/api';  // Direct backend access
        this.timeout = 5000; // 5 second timeout
        
        this.apiVersion = 'v2'; // Default to v2, can be changed to 'v1' for legacy
        this._entityNameToIdMap = new Map(); // Cache for name->id mapping
        this._entityIdToNameMap = new Map(); // Cache for id->name mapping
        
        // WebSocket properties
        this.socket = null;
        this.eventHandlers = new Map();
        this.connected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        
        // Initialize WebSocket connection for v2
        if (this.apiVersion === 'v2') {
            this.initializeWebSocket();
        }
    }

    get apiPath() {
        return this.apiVersion === 'v2' ? `${this.baseURL}/v2/memory` : `${this.baseURL}/memory`;
    }

    // Initialize WebSocket connection
    initializeWebSocket() {
        if (this.apiVersion !== 'v2') {
            console.log('WebSocket only available for API v2');
            return;
        }

        try {
            this.socket = io('http://localhost:8000', {
                transports: ['websocket', 'polling'],
                timeout: 5000,
                forceNew: true,
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionAttempts: this.maxReconnectAttempts
            });

            this.socket.on('connect', () => {
                console.log('🔗 WebSocket connected to server');
                this.connected = true;
                this.reconnectAttempts = 0;
                this.emit('connection:status', { connected: true });
            });

            this.socket.on('disconnect', (reason) => {
                console.log(`🔗 WebSocket disconnected: ${reason}`);
                this.connected = false;
                this.emit('connection:status', { connected: false, reason });
            });

            this.socket.on('connect_error', (error) => {
                console.error('🔗 WebSocket connection error:', error.message);
                this.reconnectAttempts++;
                this.emit('connection:error', { error: error.message, attempts: this.reconnectAttempts });
            });

            // Real-time event handlers
            this.socket.on('entity:created', (data) => {
                console.log('📝 Entity created:', data.entity.name);
                this.handleRealtimeEvent('entity:created', data);
            });

            this.socket.on('entity:updated', (data) => {
                console.log('✏️ Entity updated:', this._entityIdToNameMap.get(data.entity.id) || data.entity.name);
                this.handleRealtimeEvent('entity:updated', data);
            });

            this.socket.on('entity:deleted', (data) => {
                console.log('🗑️ Entity deleted:', data.entity.name);
                this.handleRealtimeEvent('entity:deleted', data);
            });

            this.socket.on('relation:created', (data) => {
                console.log('🔗 Relation created');
                this.handleRealtimeEvent('relation:created', data);
            });

            this.socket.on('relation:deleted', (data) => {
                console.log('🔗 Relation deleted');
                this.handleRealtimeEvent('relation:deleted', data);
            });

            this.socket.on('observation:created', (data) => {
                console.log('📊 Observation created');
                this.handleRealtimeEvent('observation:created', data);
            });

        } catch (error) {
            console.error('Failed to initialize WebSocket:', error);
        }
    }

    // Handle real-time events and notify listeners
    handleRealtimeEvent(event, data) {
        // Don't process events that originated from this client
        if (data.source === 'local') {
            return;
        }

        // Update internal caches for entity events
        if (event === 'entity:created' && data.entity) {
            this._entityNameToIdMap.set(data.entity.name, data.entity.id);
            this._entityIdToNameMap.set(data.entity.id, data.entity.name);
        } else if (event === 'entity:deleted' && data.entity) {
            this._entityNameToIdMap.delete(data.entity.name);
            this._entityIdToNameMap.delete(data.entity.id);
        } else if (event === 'entity:updated' && data.entity) {
            // Update name mapping if name changed
            this._entityNameToIdMap.set(data.entity.name, data.entity.id);
            this._entityIdToNameMap.set(data.entity.id, data.entity.name);
        }

        // Notify event listeners
        this.emit(event, data);
    }

    // Event listener management
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }

    off(event, handler) {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        const handlers = this.eventHandlers.get(event) || [];
        handlers.forEach(handler => {
            try {
                handler(data);
            } catch (error) {
                console.error(`Error in event handler for ${event}:`, error);
            }
        });
    }

    // Get WebSocket connection status
    isConnected() {
        return this.connected && this.socket && this.socket.connected;
    }

    // Manually reconnect WebSocket
    reconnectWebSocket() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket.connect();
        }
    }

    async fetchWithTimeout(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error(`Request timeout after ${this.timeout}ms - backend server might not be running`);
            }
            throw new Error(`Network error: ${error.message}`);
        }
    }

    // Fetch all memory data (with pagination support for v2)
    async fetchMemory() {
        try {
            if (this.apiVersion === 'v2') {
                // For v2, fetch entities and relations separately with pagination
                const [entities, relations] = await Promise.all([
                    this.fetchAllEntities(),
                    this.fetchAllRelations()
                ]);
                
                // Update name/ID maps
                entities.forEach(entity => {
                    this._entityNameToIdMap.set(entity.name, entity.id);
                    this._entityIdToNameMap.set(entity.id, entity.name);
                });
                
                return this.convertV2ToUIFormat({ entities, relations });
            } else {
                // v1 legacy support
                const response = await this.fetchWithTimeout(this.apiPath);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                return this.convertToUIFormat(data);
            }
        } catch (error) {
            console.error('Failed to fetch memory:', error);
            throw error;
        }
    }

    // Fetch all entities with pagination (v2 only)
    async fetchAllEntities(page = 1, allEntities = []) {
        const limit = 100; // Fetch 100 at a time
        const response = await this.fetchWithTimeout(
            `${this.apiPath}/entities?page=${page}&limit=${limit}&sortBy=importance_score&sortOrder=desc`
        );
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        allEntities.push(...data.entities);
        
        // If there are more pages, fetch them recursively
        if (page < data.pagination.totalPages) {
            return this.fetchAllEntities(page + 1, allEntities);
        }
        
        return allEntities;
    }

    // Fetch all relations with pagination (v2 only)
    async fetchAllRelations(limit = 1000) {
        const response = await this.fetchWithTimeout(
            `${this.apiPath}/relations?limit=${limit}`
        );
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.relations;
    }

    // Create entity
    async createEntity(entity) {
        try {
            if (this.apiVersion === 'v2') {
                const response = await this.fetchWithTimeout(`${this.apiPath}/entities`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name: entity.name,
                        type: entity.entityType || entity.type,
                        metadata: {
                            observations: entity.observations || [],
                            createdVia: 'Canvas UI'
                        }
                    })
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || `HTTP error! status: ${response.status}`);
                }
                
                const created = await response.json();
                // Update maps
                this._entityNameToIdMap.set(created.name, created.id);
                this._entityIdToNameMap.set(created.id, created.name);
                
                // Emit local event (will be ignored by WebSocket handler)
                this.emit('entity:created', {
                    entity: created,
                    timestamp: Date.now(),
                    source: 'local'
                });
                
                return { created: [this.convertV2EntityToV1(created)] };
            } else {
                // v1 legacy
                const response = await fetch(`${this.apiPath}/entities`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ entities: [entity] })
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                return await response.json();
            }
        } catch (error) {
            console.error('Failed to create entity:', error);
            throw error;
        }
    }

    // Delete entity
    async deleteEntity(entityNameOrId) {
        try {
            if (this.apiVersion === 'v2') {
                // Convert name to ID if needed
                const entityId = this._entityNameToIdMap.get(entityNameOrId) || entityNameOrId;
                
                const response = await this.fetchWithTimeout(`${this.apiPath}/entities/${entityId}`, {
                    method: 'DELETE'
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                // Clean up maps
                const name = this._entityIdToNameMap.get(entityId);
                if (name) {
                    this._entityNameToIdMap.delete(name);
                    this._entityIdToNameMap.delete(entityId);
                }
                
                // Emit local event (will be ignored by WebSocket handler)
                this.emit('entity:deleted', {
                    entityId,
                    entity: { id: entityId, name },
                    timestamp: Date.now(),
                    source: 'local'
                });
                
                return { success: true };
            } else {
                // v1 legacy
                const response = await fetch(`${this.apiPath}/entities/${encodeURIComponent(entityNameOrId)}`, {
                    method: 'DELETE'
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                return await response.json();
            }
        } catch (error) {
            console.error('Failed to delete entity:', error);
            throw error;
        }
    }

    // Create relation
    async createRelation(relation) {
        try {
            if (this.apiVersion === 'v2') {
                // Convert names to IDs
                const fromId = this._entityNameToIdMap.get(relation.from) || relation.from;
                const toId = this._entityNameToIdMap.get(relation.to) || relation.to;
                
                const response = await this.fetchWithTimeout(`${this.apiPath}/relations`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        source_id: fromId,
                        target_id: toId,
                        type: relation.relationType || relation.type || 'relates_to',
                        strength: 0.5,
                        metadata: {
                            createdVia: 'Canvas UI'
                        }
                    })
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || `HTTP error! status: ${response.status}`);
                }
                
                const created = await response.json();
                
                // Emit local event (will be ignored by WebSocket handler)
                this.emit('relation:created', {
                    relation: created,
                    timestamp: Date.now(),
                    source: 'local'
                });
                
                return { created: [this.convertV2RelationToV1(created)] };
            } else {
                // v1 legacy
                const response = await fetch(`${this.apiPath}/relations`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ relations: [relation] })
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                return await response.json();
            }
        } catch (error) {
            console.error('Failed to create relation:', error);
            throw error;
        }
    }

    // Search entities
    async searchEntities(query, strategy = 'fuzzy') {
        try {
            if (this.apiVersion === 'v2') {
                const response = await this.fetchWithTimeout(
                    `${this.apiPath}/search?q=${encodeURIComponent(query)}&strategy=${strategy}`
                );
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                return {
                    results: data.results.map(entity => this.convertV2EntityToV1(entity))
                };
            } else {
                // v1 doesn't have search endpoint in the same way
                // Fallback to client-side filtering
                const memory = await this.fetchMemory();
                const results = memory.entities.filter(entity => 
                    entity.name.toLowerCase().includes(query.toLowerCase()) ||
                    (entity.observations && entity.observations.some(obs => 
                        obs.toLowerCase().includes(query.toLowerCase())
                    ))
                );
                return { results };
            }
        } catch (error) {
            console.error('Failed to search entities:', error);
            throw error;
        }
    }

    // Get statistics (v2 only)
    async getStats() {
        if (this.apiVersion !== 'v2') {
            return null;
        }
        
        try {
            const response = await this.fetchWithTimeout(`${this.apiPath}/stats`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Failed to get stats:', error);
            throw error;
        }
    }

    // Check health
    async checkHealth() {
        try {
            // Health endpoint is at root level, not under /memory
            const healthUrl = this.baseURL.startsWith('/api') 
                ? '/health'  // Use proxy
                : 'http://localhost:8000/health';  // Direct backend
                
            const response = await this.fetchWithTimeout(healthUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Health check failed:', error);
            throw error;
        }
    }

    // Convert v2 entity to v1 format for UI compatibility
    convertV2EntityToV1(v2Entity) {
        const metadata = v2Entity.metadata || {};
        
        // Create observations array from description and metadata
        const observations = [];
        if (v2Entity.description && v2Entity.description.trim()) {
            observations.push(v2Entity.description);
        }
        if (metadata.observations && Array.isArray(metadata.observations)) {
            observations.push(...metadata.observations);
        }
        
        return {
            name: v2Entity.name,
            entityType: v2Entity.type,
            observations: observations,
            // Keep v2 fields for future use
            _v2: {
                id: v2Entity.id,
                importance_score: v2Entity.importance_score,
                created_at: v2Entity.created_at,
                updated_at: v2Entity.updated_at,
                stats: v2Entity._stats
            }
        };
    }

    // Convert v2 relation to v1 format
    convertV2RelationToV1(v2Relation) {
        const fromName = this._entityIdToNameMap.get(v2Relation.source_id) || v2Relation.from_name;
        const toName = this._entityIdToNameMap.get(v2Relation.target_id) || v2Relation.to_name;
        
        return {
            from: fromName,
            to: toName,
            relationType: v2Relation.type,
            // Keep v2 fields
            _v2: {
                id: v2Relation.id,
                source_id: v2Relation.source_id,
                target_id: v2Relation.target_id,
                strength: v2Relation.strength
            }
        };
    }

    // Convert v2 format to UI format
    convertV2ToUIFormat(v2Data) {
        const entities = v2Data.entities.map(entity => this.convertV2EntityToV1(entity));
        const relations = v2Data.relations.map(relation => this.convertV2RelationToV1(relation));
        
        return { entities, relations };
    }

    // Convert JSONL format to UI format (legacy v1)
    convertToUIFormat(rawData) {
        let entities = [];
        let relations = [];

        if (Array.isArray(rawData)) {
            rawData.forEach(item => {
                if (item.type === 'entity') {
                    entities.push({
                        name: item.name,
                        entityType: item.entityType,
                        observations: item.observations || []
                    });
                } else if (item.type === 'relation') {
                    relations.push({
                        from: item.from,
                        to: item.to,
                        relationType: item.relationType
                    });
                }
            });
        } else if (rawData.entities && rawData.relations) {
            entities = rawData.entities;
            relations = rawData.relations;
        }

        return { entities, relations };
    }

    // Switch API version
    setApiVersion(version) {
        if (version === 'v1' || version === 'v2') {
            const previousVersion = this.apiVersion;
            this.apiVersion = version;
            console.log(`Switched to API ${version}`);
            
            // Handle WebSocket connections based on version
            if (version === 'v2' && previousVersion !== 'v2') {
                // Switching to v2, initialize WebSocket
                this.initializeWebSocket();
            } else if (version === 'v1' && this.socket) {
                // Switching to v1, disconnect WebSocket
                console.log('Disconnecting WebSocket for API v1');
                this.socket.disconnect();
                this.socket = null;
                this.connected = false;
            }
        } else {
            throw new Error(`Invalid API version: ${version}`);
        }
    }
}

// Export the API instance
const memoryAPI = new MemoryAPIV2();
export { memoryAPI as MemoryAPI };
window.memoryAPI = memoryAPI;