// Memory API Service
class MemoryAPI {
    constructor() {
        this.baseURL = 'http://localhost:8000/api';
        this.timeout = 5000; // 5 second timeout
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
                throw new Error('Request timeout - backend server might not be running');
            }
            throw error;
        }
    }

    async fetchMemory() {
        try {
            console.log('Fetching memory from:', `${this.baseURL}/memory`);
            const response = await this.fetchWithTimeout(`${this.baseURL}/memory`);
            console.log('Response status:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log('Received data:', data);
            return this.convertToUIFormat(data);
        } catch (error) {
            console.error('Failed to fetch memory:', error);
            console.error('Error details:', error.message, error.stack);
            throw error;
        }
    }

    async createEntity(entity) {
        try {
            const response = await fetch(`${this.baseURL}/memory/entities`, {
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
        } catch (error) {
            console.error('Failed to create entity:', error);
            throw error;
        }
    }

    async deleteEntity(entityName) {
        try {
            const response = await fetch(`${this.baseURL}/memory/entities/${encodeURIComponent(entityName)}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Failed to delete entity:', error);
            throw error;
        }
    }

    async createRelation(relation) {
        try {
            const response = await fetch(`${this.baseURL}/memory/relations`, {
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
        } catch (error) {
            console.error('Failed to create relation:', error);
            throw error;
        }
    }

    async checkHealth() {
        try {
            console.log('Checking health at:', `${this.baseURL}/health`);
            const response = await this.fetchWithTimeout(`${this.baseURL}/health`);
            console.log('Health check response:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const healthData = await response.json();
            console.log('Health data:', healthData);
            return healthData;
        } catch (error) {
            console.error('Health check failed:', error);
            console.error('Health check error details:', error.message);
            throw error;
        }
    }

    // Convert JSONL format to UI format
    convertToUIFormat(rawData) {
        // Handle both JSON and JSONL formats
        let entities = [];
        let relations = [];

        if (Array.isArray(rawData)) {
            // If it's already an array, process each item
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
            // Standard JSON format
            entities = rawData.entities;
            relations = rawData.relations;
        }

        return { entities, relations };
    }
}

// Export the API instance
const memoryAPI = new MemoryAPI();
export { memoryAPI as MemoryAPI };
window.memoryAPI = memoryAPI;
