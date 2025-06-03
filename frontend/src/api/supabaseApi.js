// Supabase API Client for Memory System
// Direct connection to Supabase REST API

class SupabaseAPI {
    constructor() {
        // Get configuration from environment or config file
        this.baseURL = window.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
        this.anonKey = window.SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
        this.timeout = 10000; // 10 second timeout
        
        if (!this.baseURL || !this.anonKey) {
            console.error('Supabase configuration missing! Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env file');
        }
        
        // Cache for name/ID mappings
        this._entityNameToIdMap = new Map();
        this._entityIdToNameMap = new Map();
    }

    get headers() {
        return {
            'apikey': this.anonKey,
            'Authorization': `Bearer ${this.anonKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        };
    }

    async fetchWithTimeout(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    ...this.headers,
                    ...options.headers
                },
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error(`Request timeout after ${this.timeout}ms`);
            }
            throw new Error(`Network error: ${error.message}`);
        }
    }

    // Fetch all entities
    async fetchAllEntities() {
        try {
            const response = await this.fetchWithTimeout(
                `${this.baseURL}/entities?select=*&order=importance_score.desc,name.asc&limit=1000`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const entities = await response.json();
            
            // Update name/ID mappings
            entities.forEach(entity => {
                this._entityNameToIdMap.set(entity.name, entity.id);
                this._entityIdToNameMap.set(entity.id, entity.name);
            });
            
            return entities;
        } catch (error) {
            console.error('Failed to fetch entities from Supabase:', error);
            throw error;
        }
    }

    // Fetch all relations
    async fetchAllRelations() {
        try {
            const response = await this.fetchWithTimeout(
                `${this.baseURL}/relations?select=*,source_entity:source_id(name),target_entity:target_id(name)&limit=1000`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Failed to fetch relations from Supabase:', error);
            throw error;
        }
    }

    // Fetch all memory data
    async fetchMemory() {
        try {
            const [entities, relations] = await Promise.all([
                this.fetchAllEntities(),
                this.fetchAllRelations()
            ]);
            
            return this.convertToUIFormat({ entities, relations });
        } catch (error) {
            console.error('Failed to fetch memory from Supabase:', error);
            throw error;
        }
    }

    // Create entity
    async createEntity(entity) {
        try {
            const response = await this.fetchWithTimeout(`${this.baseURL}/entities`, {
                method: 'POST',
                body: JSON.stringify({
                    name: entity.name,
                    type: entity.entityType || entity.type || 'other',
                    description: Array.isArray(entity.observations) ? entity.observations.join('. ') : '',
                    metadata: {
                        observations: entity.observations || [],
                        createdVia: 'Canvas UI'
                    }
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || `HTTP error! status: ${response.status}`);
            }
            
            const created = await response.json();
            const createdEntity = Array.isArray(created) ? created[0] : created;
            
            // Update maps
            this._entityNameToIdMap.set(createdEntity.name, createdEntity.id);
            this._entityIdToNameMap.set(createdEntity.id, createdEntity.name);
            
            return { created: [this.convertSupabaseEntityToUI(createdEntity)] };
        } catch (error) {
            console.error('Failed to create entity in Supabase:', error);
            throw error;
        }
    }

    // Delete entity
    async deleteEntity(entityNameOrId) {
        try {
            // Convert name to ID if needed
            const entityId = this._entityNameToIdMap.get(entityNameOrId) || entityNameOrId;
            
            const response = await this.fetchWithTimeout(
                `${this.baseURL}/entities?id=eq.${entityId}`,
                { method: 'DELETE' }
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // Clean up maps
            const name = this._entityIdToNameMap.get(entityId);
            if (name) {
                this._entityNameToIdMap.delete(name);
                this._entityIdToNameMap.delete(entityId);
            }
            
            return { success: true };
        } catch (error) {
            console.error('Failed to delete entity from Supabase:', error);
            throw error;
        }
    }

    // Update entity
    async updateEntity(entityNameOrId, updates) {
        try {
            // Convert name to ID if needed
            const entityId = this._entityNameToIdMap.get(entityNameOrId) || entityNameOrId;
            
            // Prepare update payload - Supabase expects flat structure
            const updatePayload = {
                name: updates.name,
                entity_type: updates.entityType || updates.entity_type
            };
            
            const response = await this.fetchWithTimeout(
                `${this.baseURL}/entities?id=eq.${entityId}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(updatePayload)
                }
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const [updatedEntity] = await response.json();
            
            // Update observations if provided
            if (updates.observations && updates.observations.length > 0) {
                // Delete existing observations
                await this.fetchWithTimeout(
                    `${this.baseURL}/observations?entity_id=eq.${entityId}`,
                    { method: 'DELETE' }
                );
                
                // Add new observations
                const observationPromises = updates.observations.map(obs =>
                    this.fetchWithTimeout(`${this.baseURL}/observations`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            entity_id: entityId,
                            content: obs,
                            timestamp: new Date().toISOString()
                        })
                    })
                );
                await Promise.all(observationPromises);
            }
            
            // Update name mapping if name changed
            if (updates.name && updates.name !== this._entityIdToNameMap.get(entityId)) {
                const oldName = this._entityIdToNameMap.get(entityId);
                if (oldName) {
                    this._entityNameToIdMap.delete(oldName);
                }
                this._entityNameToIdMap.set(updates.name, entityId);
                this._entityIdToNameMap.set(entityId, updates.name);
            }
            
            // Return in the expected format
            const result = await this.getEntity(entityId);
            return result;
        } catch (error) {
            console.error('Failed to update entity in Supabase:', error);
            throw error;
        }
    }

    // Create relation
    async createRelation(relation) {
        try {
            // Convert names to IDs
            const fromId = this._entityNameToIdMap.get(relation.from) || relation.from;
            const toId = this._entityNameToIdMap.get(relation.to) || relation.to;
            
            const response = await this.fetchWithTimeout(`${this.baseURL}/relations`, {
                method: 'POST',
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
                throw new Error(error.message || `HTTP error! status: ${response.status}`);
            }
            
            const created = await response.json();
            const createdRelation = Array.isArray(created) ? created[0] : created;
            
            return { created: [this.convertSupabaseRelationToUI(createdRelation)] };
        } catch (error) {
            console.error('Failed to create relation in Supabase:', error);
            throw error;
        }
    }

    // Search entities
    async searchEntities(query, strategy = 'fuzzy') {
        try {
            // Use Supabase text search
            const response = await this.fetchWithTimeout(
                `${this.baseURL}/entities?or=(name.ilike.*${encodeURIComponent(query)}*,description.ilike.*${encodeURIComponent(query)}*)&order=importance_score.desc&limit=50`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const entities = await response.json();
            return {
                results: entities.map(entity => this.convertSupabaseEntityToUI(entity))
            };
        } catch (error) {
            console.error('Failed to search entities in Supabase:', error);
            throw error;
        }
    }

    // Get statistics
    async getStats() {
        try {
            const [entitiesResponse, relationsResponse] = await Promise.all([
                this.fetchWithTimeout(`${this.baseURL}/entities?select=count&head=true`),
                this.fetchWithTimeout(`${this.baseURL}/relations?select=count&head=true`)
            ]);
            
            const entityCount = parseInt(entitiesResponse.headers.get('Content-Range')?.split('/')[1] || '0');
            const relationCount = parseInt(relationsResponse.headers.get('Content-Range')?.split('/')[1] || '0');
            
            return {
                totalEntities: entityCount,
                totalRelations: relationCount,
                totalObservations: 0, // Would need separate query
                storage: 'supabase'
            };
        } catch (error) {
            console.error('Failed to get stats from Supabase:', error);
            return { totalEntities: 0, totalRelations: 0, totalObservations: 0, storage: 'supabase' };
        }
    }

    // Check health
    async checkHealth() {
        try {
            const response = await this.fetchWithTimeout(`${this.baseURL}/entities?select=count&head=true&limit=1`);
            return {
                status: response.ok ? 'ok' : 'error',
                timestamp: new Date().toISOString(),
                mode: 'supabase',
                api_version: '2.0'
            };
        } catch (error) {
            console.error('Supabase health check failed:', error);
            throw error;
        }
    }

    // Convert Supabase entity to UI format
    convertSupabaseEntityToUI(supabaseEntity) {
        const metadata = supabaseEntity.metadata || {};
        
        // Create observations array from description and metadata
        const observations = [];
        if (supabaseEntity.description && supabaseEntity.description.trim()) {
            observations.push(supabaseEntity.description);
        }
        if (metadata.observations && Array.isArray(metadata.observations)) {
            observations.push(...metadata.observations);
        }
        
        return {
            name: supabaseEntity.name,
            entityType: supabaseEntity.type,
            observations: observations,
            // Keep Supabase fields for future use
            _supabase: {
                id: supabaseEntity.id,
                importance_score: supabaseEntity.importance_score,
                created_at: supabaseEntity.created_at,
                updated_at: supabaseEntity.updated_at
            }
        };
    }

    // Convert Supabase relation to UI format
    convertSupabaseRelationToUI(supabaseRelation) {
        const fromName = supabaseRelation.source_entity?.name || this._entityIdToNameMap.get(supabaseRelation.source_id);
        const toName = supabaseRelation.target_entity?.name || this._entityIdToNameMap.get(supabaseRelation.target_id);
        
        return {
            from: fromName,
            to: toName,
            relationType: supabaseRelation.type,
            // Keep Supabase fields
            _supabase: {
                id: supabaseRelation.id,
                source_id: supabaseRelation.source_id,
                target_id: supabaseRelation.target_id,
                strength: supabaseRelation.strength
            }
        };
    }

    // Convert Supabase format to UI format
    convertToUIFormat(supabaseData) {
        const entities = supabaseData.entities.map(entity => this.convertSupabaseEntityToUI(entity));
        const relations = supabaseData.relations.map(relation => this.convertSupabaseRelationToUI(relation));
        
        return { entities, relations };
    }

    // WebSocket placeholder methods (Supabase doesn't support WebSocket in the same way)
    isConnected() { return false; }
    on() {}
    off() {}
    emit() {}
}

// Export the API instance
const supabaseAPI = new SupabaseAPI();
export { supabaseAPI as SupabaseAPI };
window.supabaseAPI = supabaseAPI;