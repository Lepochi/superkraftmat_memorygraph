import type { Entity, Relation, Observation } from '../types/memory.js';
import type { IMemoryBackend } from './IMemoryBackend.js';

/**
 * Supabase PostgreSQL backend implementation
 * Provides rich relational capabilities and full-text search
 */
export class SupabaseBackend implements IMemoryBackend {
  readonly name = 'Supabase PostgreSQL';
  readonly type = 'database' as const;
  
  private projectUrl: string;
  private apiKey: string;
  private performanceMetrics = {
    latency: 0,
    reliability: 0.99,
    features: ['postgresql', 'full-relations', 'real-time', 'full-text-search', 'rpc']
  };

  constructor(
    projectUrl: string = 'https://xthjwtxmlmnwcwvqfiai.supabase.co',
    apiKey?: string
  ) {
    this.projectUrl = projectUrl;
    this.apiKey = apiKey || process.env.SUPABASE_ANON_KEY || '';
  }

  async isAvailable(): Promise<boolean> {
    try {
      if (!this.apiKey) return false;
      
      const response = await fetch(`${this.projectUrl}/rest/v1/entities?limit=1`, {
        method: 'GET',
        headers: {
          'apikey': this.apiKey,
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(5000)
      });
      
      return response.ok;
    } catch {
      return false;
    }
  }

  async connect(): Promise<void> {
    if (!this.apiKey) {
      throw new Error('Supabase API key not provided');
    }
    
    if (!await this.isAvailable()) {
      throw new Error(`Supabase not available at ${this.projectUrl}`);
    }
  }

  async close(): Promise<void> {
    // No persistent connection to close for REST API
  }

  private async supabaseCall<T>(
    table: string, 
    options: {
      method?: string;
      select?: string;
      filter?: string;
      order?: string;
      limit?: number;
      body?: any;
    } = {}
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      let url = `${this.projectUrl}/rest/v1/${table}`;
      const params = new URLSearchParams();
      
      if (options.select) params.append('select', options.select);
      if (options.filter) params.append('filter', options.filter);
      if (options.order) params.append('order', options.order);
      if (options.limit) params.append('limit', options.limit.toString());
      
      if (params.toString()) {
        url += '?' + params.toString();
      }

      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: {
          'apikey': this.apiKey,
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: AbortSignal.timeout(15000) // 15 second timeout for complex queries
      });

      if (!response.ok) {
        throw new Error(`Supabase call failed: ${response.status} ${response.statusText}`);
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
    let filter = '';
    const filters: string[] = [];
    
    if (options.types?.length) {
      filters.push(`type.in.(${options.types.join(',')})`);
    }
    if (options.minImportance !== undefined) {
      filters.push(`importance_score.gte.${options.minImportance}`);
    }
    
    if (filters.length) {
      filter = filters.join('&');
    }

    return await this.supabaseCall<Entity[]>('entities', {
      select: '*',
      filter: filter || undefined,
      order: 'importance_score.desc,last_accessed.desc',
      limit: options.limit
    });
  }

  async getEntity(id: string): Promise<Entity | null> {
    try {
      const result = await this.supabaseCall<Entity[]>('entities', {
        select: '*',
        filter: `id.eq.${id}`
      });
      
      if (result.length === 0) return null;
      
      // Update access tracking
      await this.supabaseCall('entities', {
        method: 'PATCH',
        filter: `id.eq.${id}`,
        body: {
          last_accessed: Math.floor(Date.now() / 1000),
          access_count: 'access_count + 1' // Use Supabase increment
        }
      });
      
      return result[0];
    } catch {
      return null;
    }
  }

  async searchEntities(query: string, limit: number = 20): Promise<Entity[]> {
    // Use Supabase full-text search capabilities
    const filter = `or(name.ilike.%${query}%,description.ilike.%${query}%)`;
    
    return await this.supabaseCall<Entity[]>('entities', {
      select: '*',
      filter,
      order: 'importance_score.desc',
      limit
    });
  }

  async updateEntity(id: string, updates: Partial<Entity>): Promise<void> {
    await this.supabaseCall('entities', {
      method: 'PATCH',
      filter: `id.eq.${id}`,
      body: {
        ...updates,
        updated_at: Math.floor(Date.now() / 1000)
      }
    });
  }

  async getRelations(entityId: string): Promise<Relation[]> {
    const filter = `or(source_id.eq.${entityId},target_id.eq.${entityId})`;
    
    return await this.supabaseCall<Relation[]>('relations', {
      select: '*',
      filter,
      order: 'strength.desc'
    });
  }

  async getRelatedEntities(entityId: string, depth: number = 1): Promise<Entity[]> {
    // Use Supabase RPC for recursive relation traversal
    try {
      return await this.supabaseCall<Entity[]>('rpc/get_related_entities', {
        method: 'POST',
        body: {
          entity_id: entityId,
          max_depth: depth
        }
      });
    } catch {
      // Fallback: single-hop relations only
      const relations = await this.getRelations(entityId);
      const relatedIds = relations.map(r => 
        r.sourceId === entityId ? r.targetId : r.sourceId
      );
      
      if (relatedIds.length === 0) return [];
      
      const filter = `id.in.(${relatedIds.join(',')})`;
      return await this.supabaseCall<Entity[]>('entities', {
        select: '*',
        filter,
        order: 'importance_score.desc'
      });
    }
  }

  async getObservations(entityId: string, limit: number = 10): Promise<Observation[]> {
    return await this.supabaseCall<Observation[]>('observations', {
      select: '*',
      filter: `entity_id.eq.${entityId}`,
      order: 'timestamp.desc',
      limit
    });
  }

  async getRecentObservations(limit: number = 50): Promise<Observation[]> {
    return await this.supabaseCall<Observation[]>('observations', {
      select: '*, entities(name)',
      order: 'timestamp.desc',
      limit
    });
  }

  async getEntityScore(entityId: string): Promise<number> {
    try {
      // Use Supabase RPC for complex score calculation
      const result = await this.supabaseCall<{ score: number }[]>('rpc/calculate_entity_score', {
        method: 'POST',
        body: { entity_id: entityId }
      });
      
      return result[0]?.score || 0;
    } catch {
      // Fallback: simple importance score
      const entity = await this.getEntity(entityId);
      return entity ? entity.importanceScore * 100 : 0;
    }
  }

  getPerformanceMetrics() {
    return this.performanceMetrics;
  }
}