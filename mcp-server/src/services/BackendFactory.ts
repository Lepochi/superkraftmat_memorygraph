import type { IMemoryBackend, BackendSelectionCriteria, BackendStatus } from './IMemoryBackend.js';
import { LocalSQLiteBackend } from './LocalSQLiteBackend.js';
import { RailwayAPIBackend } from './RailwayAPIBackend.js';
import { SupabaseBackend } from './SupabaseBackend.js';

/**
 * Factory for creating and managing memory backends
 * Implements intelligent backend selection with fallback
 */
export class BackendFactory {
  private static instance: BackendFactory;
  private backends: IMemoryBackend[] = [];
  private statusCache: Map<string, BackendStatus> = new Map();
  private cacheTimeout = 30000; // 30 seconds

  private constructor() {
    this.initializeBackends();
  }

  static getInstance(): BackendFactory {
    if (!BackendFactory.instance) {
      BackendFactory.instance = new BackendFactory();
    }
    return BackendFactory.instance;
  }

  private initializeBackends(): void {
    // Initialize all backend types
    this.backends = [
      new LocalSQLiteBackend(),
      new RailwayAPIBackend(),
      new SupabaseBackend()
    ];
  }

  /**
   * Get the best available backend based on criteria
   */
  async getBestBackend(criteria: BackendSelectionCriteria = {}): Promise<IMemoryBackend> {
    const statuses = await this.checkAllBackends();
    const availableBackends = statuses.filter(s => s.available);

    if (availableBackends.length === 0) {
      throw new Error('No memory backends are currently available');
    }

    // Apply selection logic based on criteria
    let selectedBackend: IMemoryBackend;

    if (criteria.preferPerformance) {
      // Prioritize by performance: Local SQLite > Railway API > Supabase
      selectedBackend = this.selectByPerformance(availableBackends);
    } else if (criteria.requireRelations) {
      // Prioritize backends with strong relation support: Supabase > Local SQLite > Railway API
      selectedBackend = this.selectByRelationSupport(availableBackends);
    } else {
      // Default: balanced selection considering latency and reliability
      selectedBackend = this.selectBalanced(availableBackends, criteria.maxLatency);
    }

    // Ensure the backend is connected
    await selectedBackend.connect();
    
    console.error(`🔌 Selected backend: ${selectedBackend.name} (${selectedBackend.type})`);
    return selectedBackend;
  }

  /**
   * Get all backends in fallback order
   */
  async getFallbackChain(): Promise<IMemoryBackend[]> {
    const statuses = await this.checkAllBackends();
    const availableBackends = statuses
      .filter(s => s.available)
      .sort((a, b) => {
        // Sort by: latency (asc) then type priority (local > api > database)
        const typePriority = { local: 1, api: 2, database: 3 };
        const aPriority = typePriority[a.backend.type];
        const bPriority = typePriority[b.backend.type];
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        
        return (a.latency || 999) - (b.latency || 999);
      })
      .map(s => s.backend);

    // Connect all backends in the chain
    for (const backend of availableBackends) {
      try {
        await backend.connect();
      } catch (error) {
        console.error(`⚠️  Failed to connect to ${backend.name}:`, error);
      }
    }

    return availableBackends;
  }

  /**
   * Check availability of all backends
   */
  async checkAllBackends(): Promise<BackendStatus[]> {
    const now = Date.now();
    const results: BackendStatus[] = [];

    for (const backend of this.backends) {
      const cacheKey = backend.name;
      const cached = this.statusCache.get(cacheKey);

      // Use cached result if still valid
      if (cached && (now - cached.lastChecked) < this.cacheTimeout) {
        results.push(cached);
        continue;
      }

      // Check backend availability
      const startTime = performance.now();
      let status: BackendStatus;

      try {
        const available = await backend.isAvailable();
        const latency = performance.now() - startTime;

        status = {
          backend,
          available,
          latency,
          lastChecked: now
        };
      } catch (error) {
        status = {
          backend,
          available: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          lastChecked: now
        };
      }

      this.statusCache.set(cacheKey, status);
      results.push(status);
    }

    return results;
  }

  /**
   * Get detailed status report for all backends
   */
  async getStatusReport(): Promise<string> {
    const statuses = await this.checkAllBackends();
    const lines: string[] = [];

    lines.push('🔍 Memory Backend Status Report');
    lines.push('================================');

    for (const status of statuses) {
      const icon = status.available ? '✅' : '❌';
      const latencyStr = status.latency ? `${Math.round(status.latency)}ms` : 'N/A';
      const metrics = status.backend.getPerformanceMetrics();
      
      lines.push(`${icon} ${status.backend.name} (${status.backend.type})`);
      lines.push(`   Latency: ${latencyStr}`);
      lines.push(`   Reliability: ${(metrics.reliability * 100).toFixed(1)}%`);
      lines.push(`   Features: ${metrics.features.join(', ')}`);
      
      if (status.error) {
        lines.push(`   Error: ${status.error}`);
      }
      
      lines.push('');
    }

    const availableCount = statuses.filter(s => s.available).length;
    lines.push(`📊 Summary: ${availableCount}/${statuses.length} backends available`);

    return lines.join('\n');
  }

  private selectByPerformance(statuses: BackendStatus[]): IMemoryBackend {
    // Prioritize: Local SQLite > Railway API > Supabase
    const priorityOrder = ['local', 'api', 'database'];
    
    for (const type of priorityOrder) {
      const backend = statuses.find(s => s.backend.type === type);
      if (backend) return backend.backend;
    }
    
    return statuses[0].backend;
  }

  private selectByRelationSupport(statuses: BackendStatus[]): IMemoryBackend {
    // Prioritize: Supabase > Local SQLite > Railway API
    const priorityOrder = ['database', 'local', 'api'];
    
    for (const type of priorityOrder) {
      const backend = statuses.find(s => s.backend.type === type);
      if (backend) return backend.backend;
    }
    
    return statuses[0].backend;
  }

  private selectBalanced(statuses: BackendStatus[], maxLatency?: number): IMemoryBackend {
    // Filter by latency if specified
    let candidates = statuses;
    if (maxLatency) {
      candidates = statuses.filter(s => !s.latency || s.latency <= maxLatency);
      if (candidates.length === 0) {
        candidates = statuses; // Fallback to all if none meet latency requirement
      }
    }

    // Score based on latency, reliability, and type preference
    const scored = candidates.map(status => {
      const metrics = status.backend.getPerformanceMetrics();
      const latencyScore = Math.max(0, 100 - (status.latency || 0) / 10); // Lower latency = higher score
      const reliabilityScore = metrics.reliability * 100;
      
      // Type preference: local > api > database
      const typeScore = status.backend.type === 'local' ? 20 : 
                       status.backend.type === 'api' ? 10 : 0;
      
      const totalScore = (latencyScore + reliabilityScore + typeScore) / 3;
      
      return { status, score: totalScore };
    });

    // Return backend with highest score
    scored.sort((a, b) => b.score - a.score);
    return scored[0].status.backend;
  }

  /**
   * Clear status cache (force re-check on next call)
   */
  clearCache(): void {
    this.statusCache.clear();
  }
}