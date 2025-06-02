import type { Entity, Relation, Observation } from '../types/memory.js';
import type { IMemoryBackend } from './IMemoryBackend.js';

/**
 * Railway API backend implementation
 * Uses the deployed Railway backend as a service
 */
export class RailwayAPIBackend implements IMemoryBackend {
  readonly name = 'Railway API';
  readonly type = 'api' as const;
  
  private baseUrl: string;
  private performanceMetrics = {
    latency: 0,
    reliability: 0.95,
    features: ['rest-api', 'websocket', 'persistence', 'relations']
  };

  constructor(baseUrl: string = 'https://superkraftmatmemorygraph-production.up.railway.app') {
    this.baseUrl = baseUrl;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async connect(): Promise<void> {
    if (!await this.isAvailable()) {
      throw new Error(`Railway API not available at ${this.baseUrl}`);
    }
  }

  async close(): Promise<void> {
    // No persistent connection to close for REST API
  }

  private async apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const startTime = performance.now();
    
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json() as T;
      this.performanceMetrics.latency = performance.now() - startTime;
      return result;
    } catch (error) {
      this.performanceMetrics.latency = performance.now() - startTime;
      throw error;
    }
  }

  async getEntities(options: { types?: string[], minImportance?: number, limit?: number } = {}): Promise<Entity[]> {
    const params = new URLSearchParams();
    
    if (options.types?.length) {
      params.append('types', options.types.join(','));
    }
    if (options.minImportance !== undefined) {
      params.append('minImportance', options.minImportance.toString());
    }
    if (options.limit) {
      params.append('limit', options.limit.toString());
    }

    const endpoint = `/api/v2/memory/entities${params.toString() ? '?' + params.toString() : ''}`;
    const response = await this.apiCall<{ entities: Entity[] }>(endpoint);
    return response.entities;
  }

  async getEntity(id: string): Promise<Entity | null> {
    try {
      const response = await this.apiCall<{ entity: Entity }>(`/api/v2/memory/entities/${id}`);
      return response.entity;
    } catch (error) {
      // Return null if entity not found (404)
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async searchEntities(query: string, limit: number = 20): Promise<Entity[]> {
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString()
    });

    const response = await this.apiCall<{ entities: Entity[] }>(`/api/v2/memory/search?${params.toString()}`);
    return response.entities;
  }

  async updateEntity(id: string, updates: Partial<Entity>): Promise<void> {
    await this.apiCall(`/api/v2/memory/entities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async getRelations(entityId: string): Promise<Relation[]> {
    const response = await this.apiCall<{ relations: Relation[] }>(`/api/v2/memory/entities/${entityId}?include=relations`);
    return response.relations || [];
  }

  async getRelatedEntities(entityId: string, depth: number = 1): Promise<Entity[]> {
    const params = new URLSearchParams({
      depth: depth.toString()
    });

    const response = await this.apiCall<{ entities: Entity[] }>(`/api/v2/memory/entities/${entityId}/related?${params.toString()}`);
    return response.entities;
  }

  async getObservations(entityId: string, limit: number = 10): Promise<Observation[]> {
    const params = new URLSearchParams({
      limit: limit.toString()
    });

    const response = await this.apiCall<{ observations: Observation[] }>(`/api/v2/memory/entities/${entityId}/observations?${params.toString()}`);
    return response.observations || [];
  }

  async getRecentObservations(limit: number = 50): Promise<Observation[]> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      recent: 'true'
    });

    const response = await this.apiCall<{ observations: Observation[] }>(`/api/v2/memory/observations?${params.toString()}`);
    return response.observations || [];
  }

  async getEntityScore(entityId: string): Promise<number> {
    try {
      const response = await this.apiCall<{ score: number }>(`/api/v2/memory/entities/${entityId}/score`);
      return response.score;
    } catch {
      // Fallback: calculate basic score from entity data
      const entity = await this.getEntity(entityId);
      return entity ? entity.importanceScore * 100 : 0;
    }
  }

  getPerformanceMetrics() {
    return this.performanceMetrics;
  }
}