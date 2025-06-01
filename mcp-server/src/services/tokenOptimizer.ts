import type { Memory } from '../types/memory.js';

export class TokenOptimizer {
  // Rough token estimation constants
  private static readonly CHARS_PER_TOKEN = 4;
  private static readonly BASE_MEMORY_TOKENS = 50; // ID, type, timestamps, etc.
  private static readonly RELATION_TOKENS = 20; // Per relation
  private static readonly OBSERVATION_TOKENS = 30; // Per observation

  /**
   * Estimates token count for a memory object
   */
  static estimateTokens(memory: Memory): number {
    let tokens = this.BASE_MEMORY_TOKENS;

    // Entity name and description
    tokens += Math.ceil((memory.entity.name.length + (memory.entity.description?.length || 0)) / this.CHARS_PER_TOKEN);

    // Metadata
    if (memory.entity.metadata) {
      tokens += Math.ceil(JSON.stringify(memory.entity.metadata).length / this.CHARS_PER_TOKEN);
    }

    // Relations
    if (memory.relations) {
      tokens += memory.relations.length * this.RELATION_TOKENS;
    }

    // Observations
    if (memory.observations) {
      memory.observations.forEach(obs => {
        tokens += this.OBSERVATION_TOKENS;
        tokens += Math.ceil(obs.content.length / this.CHARS_PER_TOKEN);
      });
    }

    return tokens;
  }

  /**
   * Optimizes memories to fit within token limit
   */
  static optimizeForTokens(memories: Memory[], tokenLimit: number): Memory[] {
    const optimized: Memory[] = [];
    let currentTokens = 0;

    // Sort memories by score/relevance (should already be sorted)
    const sorted = [...memories];

    for (const memory of sorted) {
      const memoryTokens = this.estimateTokens(memory);
      
      // If this memory would exceed limit, try to optimize it
      if (currentTokens + memoryTokens > tokenLimit) {
        // Create a trimmed version
        const trimmed = this.trimMemory(memory, tokenLimit - currentTokens);
        
        if (trimmed) {
          const trimmedTokens = this.estimateTokens(trimmed);
          if (currentTokens + trimmedTokens <= tokenLimit) {
            optimized.push(trimmed);
            currentTokens += trimmedTokens;
          } else {
            // Can't fit even trimmed version, stop here
            break;
          }
        } else {
          // Can't trim further, stop
          break;
        }
      } else {
        // Memory fits as-is
        optimized.push(memory);
        currentTokens += memoryTokens;
      }
    }

    return optimized;
  }

  /**
   * Trims a memory to fit within token budget
   */
  private static trimMemory(memory: Memory, maxTokens: number): Memory | null {
    // If even base memory won't fit, return null
    if (maxTokens < this.BASE_MEMORY_TOKENS) {
      return null;
    }

    // Create a copy to modify
    const trimmed: Memory = {
      entity: { ...memory.entity },
      score: memory.score
    };

    let currentTokens = this.BASE_MEMORY_TOKENS;
    currentTokens += Math.ceil((trimmed.entity.name.length + (trimmed.entity.description?.length || 0)) / this.CHARS_PER_TOKEN);

    // Try to fit relations (most important first)
    if (memory.relations && currentTokens < maxTokens) {
      const relationBudget = maxTokens - currentTokens;
      const maxRelations = Math.floor(relationBudget / this.RELATION_TOKENS);
      
      if (maxRelations > 0) {
        // Take the strongest relations
        const sortedRelations = [...memory.relations].sort((a, b) => b.strength - a.strength);
        trimmed.relations = sortedRelations.slice(0, maxRelations);
        currentTokens += trimmed.relations.length * this.RELATION_TOKENS;
      }
    }

    // Try to fit observations (most recent first)
    if (memory.observations && currentTokens < maxTokens) {
      trimmed.observations = [];
      
      for (const obs of memory.observations) {
        const obsTokens = this.OBSERVATION_TOKENS + Math.ceil(obs.content.length / this.CHARS_PER_TOKEN);
        if (currentTokens + obsTokens <= maxTokens) {
          trimmed.observations.push(obs);
          currentTokens += obsTokens;
        } else {
          // Try to fit a truncated version
          const availableChars = (maxTokens - currentTokens - this.OBSERVATION_TOKENS) * this.CHARS_PER_TOKEN;
          if (availableChars > 50) { // Minimum useful observation length
            trimmed.observations.push({
              ...obs,
              content: obs.content.substring(0, availableChars) + '...'
            });
          }
          break;
        }
      }
    }

    return trimmed;
  }

  /**
   * Provides token usage statistics
   */
  static getTokenStats(memories: Memory[]): {
    totalTokens: number;
    perMemory: Array<{ id: string; name: string; tokens: number }>;
    breakdown: {
      entities: number;
      relations: number;
      observations: number;
    };
  } {
    let totalTokens = 0;
    let entityTokens = 0;
    let relationTokens = 0;
    let observationTokens = 0;
    const perMemory: Array<{ id: string; name: string; tokens: number }> = [];

    for (const memory of memories) {
      const tokens = this.estimateTokens(memory);
      totalTokens += tokens;
      
      perMemory.push({
        id: memory.entity.id,
        name: memory.entity.name,
        tokens
      });

      // Calculate breakdown
      entityTokens += this.BASE_MEMORY_TOKENS + 
        Math.ceil((memory.entity.name.length + (memory.entity.description?.length || 0)) / this.CHARS_PER_TOKEN);
      
      if (memory.relations) {
        relationTokens += memory.relations.length * this.RELATION_TOKENS;
      }
      
      if (memory.observations) {
        memory.observations.forEach(obs => {
          observationTokens += this.OBSERVATION_TOKENS + 
            Math.ceil(obs.content.length / this.CHARS_PER_TOKEN);
        });
      }
    }

    return {
      totalTokens,
      perMemory,
      breakdown: {
        entities: entityTokens,
        relations: relationTokens,
        observations: observationTokens
      }
    };
  }
}