import type { Memory, ConversationContext } from '../types/memory.js';

export class ContextAnalyzer {
  /**
   * Analyzes conversation context to determine relevant entities
   */
  static analyzeContext(context: ConversationContext): {
    keywords: string[];
    entityTypes: string[];
    importanceThreshold: number;
  } {
    const keywords: string[] = [];
    const entityTypes: string[] = [];
    let importanceThreshold = 0.3; // Default threshold

    // Extract keywords from topic
    if (context.topic) {
      // Split topic into words and filter meaningful ones
      const words = context.topic.toLowerCase().split(/\s+/)
        .filter(word => word.length > 3); // Skip short words
      keywords.push(...words);

      // Adjust entity types based on topic keywords
      if (context.topic.match(/\b(person|people|team|colleague)\b/i)) {
        entityTypes.push('person');
      }
      if (context.topic.match(/\b(task|todo|work|project)\b/i)) {
        entityTypes.push('task', 'goal');
      }
      if (context.topic.match(/\b(idea|concept|theory|principle)\b/i)) {
        entityTypes.push('concept', 'insight');
      }
      if (context.topic.match(/\b(event|meeting|conference|milestone)\b/i)) {
        entityTypes.push('event');
      }
    }

    // Adjust importance threshold based on context depth
    if (context.depth && context.depth > 2) {
      importanceThreshold = 0.2; // Lower threshold for deeper searches
    }

    // If we have recent entities, we want related ones regardless of type
    if (context.recentEntities && context.recentEntities.length > 0) {
      importanceThreshold = 0.1; // Very low threshold for related entities
    }

    return {
      keywords,
      entityTypes: entityTypes.length > 0 ? entityTypes : ['person', 'concept', 'task', 'goal', 'event', 'insight'],
      importanceThreshold
    };
  }

  /**
   * Scores memories based on relevance to context
   */
  static scoreMemoryRelevance(memory: Memory, context: ConversationContext, keywords: string[]): number {
    let relevanceScore = memory.score || 0;

    // Boost score if entity name or description contains keywords
    if (keywords.length > 0) {
      const entityText = `${memory.entity.name} ${memory.entity.description || ''}`.toLowerCase();
      const keywordMatches = keywords.filter(keyword => entityText.includes(keyword)).length;
      relevanceScore += keywordMatches * 10; // 10 points per keyword match
    }

    // Boost score if entity was recently mentioned
    if (context.recentEntities?.includes(memory.entity.id)) {
      relevanceScore += 30; // Significant boost for recent mentions
    }

    // Boost score based on recent observations
    if (memory.observations && memory.observations.length > 0) {
      const recentObservation = memory.observations[0];
      const daysSinceObservation = (Date.now() / 1000 - recentObservation.timestamp) / 86400;
      if (daysSinceObservation < 7) {
        relevanceScore += 15; // Recent activity boost
      }
    }

    return Math.min(100, relevanceScore); // Cap at 100
  }

  /**
   * Filters and sorts memories based on context
   */
  static filterByContext(memories: Memory[], context: ConversationContext): Memory[] {
    const { keywords, importanceThreshold } = this.analyzeContext(context);

    // Filter by importance threshold
    let filtered = memories.filter(m => 
      (m.entity.importanceScore || 0) >= importanceThreshold
    );

    // Score and sort by relevance
    const scored = filtered.map(memory => ({
      memory,
      relevance: this.scoreMemoryRelevance(memory, context, keywords)
    }));

    // Sort by relevance score
    scored.sort((a, b) => b.relevance - a.relevance);

    return scored.map(s => s.memory);
  }
}