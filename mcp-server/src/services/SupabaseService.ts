import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Entity, Relation, Observation } from '../types/memory.js';

/**
 * Direct Supabase service for MCP server
 * Simplified architecture with no fallbacks or abstractions
 */
export class SupabaseService {
  private supabase: SupabaseClient;
  private projectUrl: string;

  constructor() {
    this.projectUrl = process.env.SUPABASE_URL || '';
    const apiKey = process.env.SUPABASE_ANON_KEY || '';
    
    if (!this.projectUrl || !apiKey) {
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required. Please set them in your .env file.');
    }

    this.supabase = createClient(this.projectUrl, apiKey);
    console.error(`✅ Supabase service initialized for ${this.projectUrl}`);
  }

  // Entity operations
  async getEntities(options: { types?: string[], minImportance?: number, limit?: number } = {}): Promise<Entity[]> {
    let query = this.supabase
      .from('entities')
      .select('*')
      .order('importance_score', { ascending: false })
      .order('last_accessed', { ascending: false });

    if (options.types?.length) {
      query = query.in('type', options.types);
    }
    
    if (options.minImportance !== undefined) {
      query = query.gte('importance_score', options.minImportance);
    }
    
    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching entities:', error);
      throw new Error(`Failed to fetch entities: ${error.message}`);
    }

    return this.convertEntities(data || []);
  }

  async getEntity(id: string): Promise<Entity | null> {
    const { data, error } = await this.supabase
      .from('entities')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch entity: ${error.message}`);
    }

    // Update access tracking
    await this.supabase
      .from('entities')
      .update({
        last_accessed: Math.floor(Date.now() / 1000),
        access_count: (data.access_count || 0) + 1
      })
      .eq('id', id);

    return this.convertEntity(data);
  }

  async searchEntities(query: string, limit: number = 20): Promise<Entity[]> {
    const { data, error } = await this.supabase
      .from('entities')
      .select('*')
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .order('importance_score', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to search entities: ${error.message}`);
    }

    return this.convertEntities(data || []);
  }

  async updateEntity(id: string, updates: Partial<Entity>): Promise<void> {
    const dbUpdates: any = {
      updated_at: Math.floor(Date.now() / 1000)
    };

    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.importanceScore !== undefined) dbUpdates.importance_score = updates.importanceScore;
    if (updates.metadata !== undefined) dbUpdates.metadata = updates.metadata;

    const { error } = await this.supabase
      .from('entities')
      .update(dbUpdates)
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update entity: ${error.message}`);
    }
  }

  // Relation operations
  async getRelations(entityId: string): Promise<Relation[]> {
    const { data, error } = await this.supabase
      .from('relations')
      .select('*')
      .or(`source_id.eq.${entityId},target_id.eq.${entityId}`)
      .order('strength', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch relations: ${error.message}`);
    }

    return this.convertRelations(data || []);
  }

  async getRelatedEntities(entityId: string, _depth: number = 1): Promise<Entity[]> {
    // For now, just get direct relations (depth 1)
    // Can enhance with recursive CTEs later if needed
    const relations = await this.getRelations(entityId);
    const relatedIds = relations.map(r => 
      r.sourceId === entityId ? r.targetId : r.sourceId
    );

    if (relatedIds.length === 0) return [];

    const { data, error } = await this.supabase
      .from('entities')
      .select('*')
      .in('id', relatedIds)
      .order('importance_score', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch related entities: ${error.message}`);
    }

    return this.convertEntities(data || []);
  }

  // Observation operations
  async getObservations(entityId: string, limit: number = 10): Promise<Observation[]> {
    const { data, error } = await this.supabase
      .from('observations')
      .select('*')
      .eq('entity_id', entityId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch observations: ${error.message}`);
    }

    return this.convertObservations(data || []);
  }

  async getRecentObservations(limit: number = 50): Promise<Observation[]> {
    const { data, error } = await this.supabase
      .from('observations')
      .select(`
        *,
        entities!inner(name)
      `)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch recent observations: ${error.message}`);
    }

    return this.convertObservations(data || []);
  }

  // Score operations
  async getEntityScore(entityId: string): Promise<number> {
    // Simple scoring based on importance_score
    // Can enhance with more complex scoring logic if needed
    const entity = await this.getEntity(entityId);
    if (!entity) return 0;
    
    return entity.importanceScore * 100;
  }

  // Helper methods to convert database format to MCP types
  private convertEntity(dbEntity: any): Entity {
    return {
      id: dbEntity.id,
      type: dbEntity.type,
      name: dbEntity.name,
      description: dbEntity.description,
      importanceScore: dbEntity.importance_score,
      createdAt: dbEntity.created_at,
      updatedAt: dbEntity.updated_at,
      lastAccessed: dbEntity.last_accessed,
      accessCount: dbEntity.access_count,
      metadata: dbEntity.metadata
    };
  }

  private convertEntities(dbEntities: any[]): Entity[] {
    return dbEntities.map(e => this.convertEntity(e));
  }

  private convertRelation(dbRelation: any): Relation {
    return {
      id: dbRelation.id,
      sourceId: dbRelation.source_id,
      targetId: dbRelation.target_id,
      type: dbRelation.type,
      strength: dbRelation.strength,
      createdAt: dbRelation.created_at,
      metadata: dbRelation.metadata
    };
  }

  private convertRelations(dbRelations: any[]): Relation[] {
    return dbRelations.map(r => this.convertRelation(r));
  }

  private convertObservation(dbObservation: any): Observation {
    return {
      id: dbObservation.id,
      entityId: dbObservation.entity_id,
      content: dbObservation.content,
      timestamp: dbObservation.timestamp,
      context: dbObservation.context,
      importance: dbObservation.importance
    };
  }

  private convertObservations(dbObservations: any[]): Observation[] {
    return dbObservations.map(o => this.convertObservation(o));
  }
}