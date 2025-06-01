export interface Entity {
  id: string;
  type: 'person' | 'concept' | 'event' | 'task' | 'insight' | 'goal';
  name: string;
  description?: string;
  importanceScore: number;
  createdAt: number;
  updatedAt: number;
  lastAccessed: number;
  accessCount: number;
  metadata?: Record<string, any>;
}

export interface Relation {
  id: number;
  sourceId: string;
  targetId: string;
  type: 'relates_to' | 'causes' | 'prevents' | 'supports' | 'contradicts' | 'requires' | 'part_of';
  strength: number;
  createdAt: number;
  metadata?: Record<string, any>;
}

export interface Observation {
  id: number;
  entityId: string;
  content: string;
  timestamp: number;
  context?: Record<string, any>;
  importance: number;
}

export interface Score {
  id: number;
  entityId: string;
  scoreType: 'importance' | 'relevance' | 'decay';
  value: number;
  calculatedAt: number;
  factors?: Record<string, any>;
}

export interface Memory {
  entity: Entity;
  relations?: Relation[];
  observations?: Observation[];
  score?: number;
}

export interface SearchOptions {
  query?: string;
  types?: Entity['type'][];
  minImportance?: number;
  limit?: number;
  includeRelations?: boolean;
  includeObservations?: boolean;
}

export interface ConversationContext {
  topic?: string;
  recentEntities?: string[];
  depth?: number;
  tokenLimit?: number;
}