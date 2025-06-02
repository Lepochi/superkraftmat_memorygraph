import type { Entity, Relation, Observation } from '../types/memory.js';

/**
 * Common interface for all memory backend implementations
 * Supports local SQLite, Railway API, and Supabase PostgreSQL
 */
export interface IMemoryBackend {
  /**
   * Backend identification
   */
  readonly name: string;
  readonly type: 'local' | 'api' | 'database';
  
  /**
   * Health check - returns true if backend is available
   */
  isAvailable(): Promise<boolean>;
  
  /**
   * Connection management
   */
  connect(): Promise<void>;
  close(): Promise<void>;
  
  /**
   * Entity operations
   */
  getEntities(options?: {
    types?: string[];
    minImportance?: number;
    limit?: number;
  }): Promise<Entity[]>;
  
  getEntity(id: string): Promise<Entity | null>;
  
  searchEntities(query: string, limit?: number): Promise<Entity[]>;
  
  updateEntity(id: string, updates: Partial<Entity>): Promise<void>;
  
  /**
   * Relation operations
   */
  getRelations(entityId: string): Promise<Relation[]>;
  
  getRelatedEntities(entityId: string, depth?: number): Promise<Entity[]>;
  
  /**
   * Observation operations
   */
  getObservations(entityId: string, limit?: number): Promise<Observation[]>;
  
  getRecentObservations(limit?: number): Promise<Observation[]>;
  
  /**
   * Score operations
   */
  getEntityScore(entityId: string): Promise<number>;
  
  /**
   * Performance metrics
   */
  getPerformanceMetrics(): {
    latency: number;
    reliability: number;
    features: string[];
  };
}

/**
 * Backend selection criteria
 */
export interface BackendSelectionCriteria {
  preferPerformance?: boolean;
  requireRelations?: boolean;
  fallbackChain?: boolean;
  maxLatency?: number;
}

/**
 * Backend status information
 */
export interface BackendStatus {
  backend: IMemoryBackend;
  available: boolean;
  latency?: number;
  error?: string;
  lastChecked: number;
}