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

  async createEntity(
    name: string,
    type: Entity['type'],
    description?: string,
    importanceScore: number = 0.5,
    metadata?: Record<string, any>
  ): Promise<Entity> {
    // Validate entity type
    const validEntityTypes = ['person', 'concept', 'event', 'task', 'insight', 'goal'];
    if (!validEntityTypes.includes(type)) {
      throw new Error(`Invalid entity type: ${type}. Must be one of: ${validEntityTypes.join(', ')}`);
    }

    // Validate importance score
    if (importanceScore < 0 || importanceScore > 1) {
      throw new Error('Importance score must be between 0 and 1');
    }

    const now = Math.floor(Date.now() / 1000);
    const id = crypto.randomUUID();

    const { data, error } = await this.supabase
      .from('entities')
      .insert({
        id,
        name,
        type,
        description: description || '',
        importance_score: importanceScore,
        metadata: metadata || {},
        created_at: now,
        updated_at: now,
        last_accessed: now,
        access_count: 0
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create entity: ${error.message}`);
    }

    return this.convertEntity(data);
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

  async deleteEntity(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('entities')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete entity: ${error.message}`);
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

  async createRelation(
    sourceId: string,
    targetId: string,
    type: Relation['type'],
    strength: number = 0.5,
    metadata?: Record<string, any>
  ): Promise<Relation> {
    // Validate relation type
    const validRelationTypes = ['relates_to', 'causes', 'prevents', 'supports', 'contradicts', 'requires', 'part_of'];
    if (!validRelationTypes.includes(type)) {
      throw new Error(`Invalid relation type: ${type}. Must be one of: ${validRelationTypes.join(', ')}`);
    }

    // Validate strength score
    if (strength < 0 || strength > 1) {
      throw new Error('Relation strength must be between 0 and 1');
    }

    // Prevent self-referential relations
    if (sourceId === targetId) {
      throw new Error('Cannot create a relation from an entity to itself');
    }

    const now = Math.floor(Date.now() / 1000);

    const { data, error } = await this.supabase
      .from('relations')
      .insert({
        source_id: sourceId,
        target_id: targetId,
        type,
        strength,
        metadata: metadata || {},
        created_at: now
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create relation: ${error.message}`);
    }

    return this.convertRelation(data);
  }

  async deleteRelation(id: number): Promise<void> {
    const { error } = await this.supabase
      .from('relations')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete relation: ${error.message}`);
    }
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

  async createObservation(
    entityId: string,
    content: string,
    importance: number = 0.5,
    context?: Record<string, any>
  ): Promise<Observation> {
    const now = Math.floor(Date.now() / 1000);

    // Build insert object conditionally based on whether context exists
    const insertData: any = {
      entity_id: entityId,
      content,
      importance,
      timestamp: now
    };

    // Only add context if it's provided and the column exists
    // This handles cases where the context column might not exist in the database
    if (context && Object.keys(context).length > 0) {
      // Try with context first
      const { data, error } = await this.supabase
        .from('observations')
        .insert({
          ...insertData,
          context
        })
        .select()
        .single();

      if (error && error.message.includes('context')) {
        // If context column doesn't exist, try without it
        console.warn('Context column not available in observations table, inserting without context');
        const { data: dataWithoutContext, error: errorWithoutContext } = await this.supabase
          .from('observations')
          .insert(insertData)
          .select()
          .single();

        if (errorWithoutContext) {
          throw new Error(`Failed to create observation: ${errorWithoutContext.message}`);
        }

        return this.convertObservation(dataWithoutContext);
      } else if (error) {
        throw new Error(`Failed to create observation: ${error.message}`);
      }

      return this.convertObservation(data);
    } else {
      // No context provided, insert without it
      const { data, error } = await this.supabase
        .from('observations')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create observation: ${error.message}`);
      }

      return this.convertObservation(data);
    }
  }

  async deleteObservation(id: number): Promise<void> {
    const { error } = await this.supabase
      .from('observations')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete observation: ${error.message}`);
    }
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