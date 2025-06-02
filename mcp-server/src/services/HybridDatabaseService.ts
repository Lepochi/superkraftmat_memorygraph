import type { Entity, Relation, Observation } from '../types/memory.js';
import type { IMemoryBackend, BackendSelectionCriteria } from './IMemoryBackend.js';
import { BackendFactory } from './BackendFactory.js';

/**
 * Hybrid database service that intelligently selects backends
 * Provides transparent fallback and optimization capabilities
 */
export class HybridDatabaseService {
  private factory: BackendFactory;
  private primaryBackend: IMemoryBackend | null = null;
  private fallbackChain: IMemoryBackend[] = [];
  private lastBackendCheck = 0;
  private recheckInterval = 60000; // 1 minute

  constructor() {
    this.factory = BackendFactory.getInstance();
  }

  /**
   * Initialize the service and select optimal backend
   */
  async initialize(criteria: BackendSelectionCriteria = {}): Promise<void> {
    console.error('🚀 Initializing Hybrid Memory Database Service...');
    
    try {
      // Get primary backend
      this.primaryBackend = await this.factory.getBestBackend(criteria);
      
      // Get fallback chain for resilience
      this.fallbackChain = await this.factory.getFallbackChain();
      
      console.error(`✅ Primary backend: ${this.primaryBackend.name}`);
      console.error(`🔄 Fallback chain: ${this.fallbackChain.map(b => b.name).join(' → ')}`);
      
      this.lastBackendCheck = Date.now();
    } catch (error) {
      console.error('❌ Failed to initialize hybrid database service:', error);
      throw error;
    }
  }

  /**
   * Get status report for debugging
   */
  async getStatusReport(): Promise<string> {
    return await this.factory.getStatusReport();
  }

  /**
   * Execute operation with automatic fallback
   */
  private async executeWithFallback<T>(
    operation: (backend: IMemoryBackend) => Promise<T>,
    operationName: string
  ): Promise<T> {
    // Check if we need to refresh backend selection
    if (Date.now() - this.lastBackendCheck > this.recheckInterval) {
      await this.refreshBackends();
    }

    const backends = this.fallbackChain.length > 0 ? this.fallbackChain : 
                    this.primaryBackend ? [this.primaryBackend] : [];

    if (backends.length === 0) {
      throw new Error('No backends available for operation');
    }

    let lastError: Error | null = null;

    for (const backend of backends) {
      try {
        const result = await operation(backend);
        
        // If this wasn't our primary backend, log the fallback
        if (backend !== this.primaryBackend) {
          console.error(`⚠️  ${operationName} fell back to ${backend.name}`);
        }
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`❌ ${operationName} failed on ${backend.name}:`, lastError.message);
        
        // Continue to next backend in fallback chain
        continue;
      }
    }

    // All backends failed
    throw new Error(`All backends failed for ${operationName}. Last error: ${lastError?.message}`);
  }

  /**
   * Refresh backend selection
   */
  private async refreshBackends(): Promise<void> {
    try {
      this.factory.clearCache();
      this.fallbackChain = await this.factory.getFallbackChain();
      this.primaryBackend = this.fallbackChain[0] || null;
      this.lastBackendCheck = Date.now();
    } catch (error) {
      console.error('⚠️  Failed to refresh backends:', error);
    }
  }

  // Entity operations
  async getEntities(options: { types?: string[], minImportance?: number, limit?: number } = {}): Promise<Entity[]> {
    return this.executeWithFallback(
      backend => backend.getEntities(options),
      'getEntities'
    );
  }

  async getEntity(id: string): Promise<Entity | null> {
    return this.executeWithFallback(
      backend => backend.getEntity(id),
      'getEntity'
    );
  }

  async searchEntities(query: string, limit: number = 20): Promise<Entity[]> {
    return this.executeWithFallback(
      backend => backend.searchEntities(query, limit),
      'searchEntities'
    );
  }

  async updateEntity(id: string, updates: Partial<Entity>): Promise<void> {
    return this.executeWithFallback(
      backend => backend.updateEntity(id, updates),
      'updateEntity'
    );
  }

  // Relation operations
  async getRelations(entityId: string): Promise<Relation[]> {
    return this.executeWithFallback(
      backend => backend.getRelations(entityId),
      'getRelations'
    );
  }

  async getRelatedEntities(entityId: string, depth: number = 1): Promise<Entity[]> {
    return this.executeWithFallback(
      backend => backend.getRelatedEntities(entityId, depth),
      'getRelatedEntities'
    );
  }

  // Observation operations
  async getObservations(entityId: string, limit: number = 10): Promise<Observation[]> {
    return this.executeWithFallback(
      backend => backend.getObservations(entityId, limit),
      'getObservations'
    );
  }

  async getRecentObservations(limit: number = 50): Promise<Observation[]> {
    return this.executeWithFallback(
      backend => backend.getRecentObservations(limit),
      'getRecentObservations'
    );
  }

  // Score operations
  async getEntityScore(entityId: string): Promise<number> {
    return this.executeWithFallback(
      backend => backend.getEntityScore(entityId),
      'getEntityScore'
    );
  }

  /**
   * Get performance metrics from current primary backend
   */
  getPerformanceMetrics() {
    if (!this.primaryBackend) {
      return {
        latency: 999,
        reliability: 0,
        features: []
      };
    }
    
    return this.primaryBackend.getPerformanceMetrics();
  }

  /**
   * Close all backend connections
   */
  async close(): Promise<void> {
    console.error('🔌 Closing hybrid database service...');
    
    const closePromises: Promise<void>[] = [];
    
    if (this.primaryBackend) {
      closePromises.push(this.primaryBackend.close());
    }
    
    for (const backend of this.fallbackChain) {
      if (backend !== this.primaryBackend) {
        closePromises.push(backend.close());
      }
    }
    
    await Promise.allSettled(closePromises);
    console.error('✅ All backends closed');
  }

  /**
   * Force switch to specific backend type (for testing)
   */
  async switchToBackend(type: 'local' | 'api' | 'database'): Promise<void> {
    const criteria: BackendSelectionCriteria = {
      preferPerformance: type === 'local',
      requireRelations: type === 'database'
    };
    
    await this.initialize(criteria);
  }
}