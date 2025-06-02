import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import type { Entity, Relation, Observation } from '../types/memory.js';
import type { IMemoryBackend } from './IMemoryBackend.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Local SQLite backend implementation
 * Direct database access for maximum performance
 */
export class LocalSQLiteBackend implements IMemoryBackend {
  readonly name = 'Local SQLite';
  readonly type = 'local' as const;
  
  private db: Database.Database | null = null;
  private dbPath: string;
  private performanceMetrics = {
    latency: 0,
    reliability: 1.0,
    features: ['full-text-search', 'relations', 'transactions', 'high-performance']
  };

  constructor() {
    // Navigate from mcp-server/dist/services/ to project root, then to memory/database/
    this.dbPath = join(__dirname, '../../../memory/database/superkraft.db');
  }

  async isAvailable(): Promise<boolean> {
    try {
      return existsSync(this.dbPath);
    } catch {
      return false;
    }
  }

  async connect(): Promise<void> {
    if (this.db) return;
    
    if (!await this.isAvailable()) {
      throw new Error(`SQLite database not found at ${this.dbPath}`);
    }

    this.db = new Database(this.dbPath, { 
      readonly: false,
      fileMustExist: true
    });
    
    // Enable WAL mode for better concurrency
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('cache_size = -64000'); // 64MB cache
    this.db.pragma('mmap_size = 268435456'); // 256MB memory map
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  private ensureConnected(): Database.Database {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  async getEntities(options: { types?: string[], minImportance?: number, limit?: number } = {}): Promise<Entity[]> {
    const startTime = performance.now();
    const db = this.ensureConnected();
    
    let query = 'SELECT * FROM entities WHERE 1=1';
    const params: any = {};
    
    if (options.types && options.types.length > 0) {
      query += ` AND type IN (${options.types.map((_, i) => `$type${i}`).join(',')})`;
      options.types.forEach((type, i) => {
        params[`type${i}`] = type;
      });
    }
    
    if (options.minImportance !== undefined) {
      query += ' AND importance_score >= $minImportance';
      params.minImportance = options.minImportance;
    }
    
    query += ' ORDER BY importance_score DESC, last_accessed DESC';
    
    if (options.limit) {
      query += ' LIMIT $limit';
      params.limit = options.limit;
    }
    
    const stmt = db.prepare(query);
    const result = stmt.all(params) as Entity[];
    
    this.performanceMetrics.latency = performance.now() - startTime;
    return result;
  }

  async getEntity(id: string): Promise<Entity | null> {
    const db = this.ensureConnected();
    const stmt = db.prepare('SELECT * FROM entities WHERE id = ?');
    const entity = stmt.get(id) as Entity | undefined;
    
    if (entity) {
      // Update access tracking
      const updateStmt = db.prepare(
        'UPDATE entities SET last_accessed = unixepoch(), access_count = access_count + 1 WHERE id = ?'
      );
      updateStmt.run(id);
    }
    
    return entity || null;
  }

  async searchEntities(query: string, limit: number = 20): Promise<Entity[]> {
    const db = this.ensureConnected();
    const stmt = db.prepare(`
      SELECT * FROM entities 
      WHERE name LIKE ? OR description LIKE ?
      ORDER BY 
        CASE 
          WHEN name LIKE ? THEN 1 
          WHEN name LIKE ? THEN 2
          ELSE 3 
        END,
        importance_score DESC
      LIMIT ?
    `);
    
    const searchPattern = `%${query}%`;
    const exactPattern = query;
    
    return stmt.all(
      searchPattern, 
      searchPattern, 
      exactPattern,
      searchPattern,
      limit
    ) as Entity[];
  }

  async updateEntity(id: string, updates: Partial<Entity>): Promise<void> {
    const db = this.ensureConnected();
    const fields = Object.keys(updates)
      .filter(key => key !== 'id')
      .map(key => `${key} = @${key}`)
      .join(', ');
    
    if (!fields) return;
    
    const stmt = db.prepare(`
      UPDATE entities 
      SET ${fields}, updated_at = unixepoch()
      WHERE id = @id
    `);
    
    stmt.run({ id, ...updates });
  }

  async getRelations(entityId: string): Promise<Relation[]> {
    const db = this.ensureConnected();
    const stmt = db.prepare(`
      SELECT * FROM relations 
      WHERE source_id = ? OR target_id = ?
      ORDER BY strength DESC
    `);
    
    return stmt.all(entityId, entityId) as Relation[];
  }

  async getRelatedEntities(entityId: string, depth: number = 1): Promise<Entity[]> {
    if (depth < 1) return [];
    
    const db = this.ensureConnected();
    // Recursive CTE to find entities within N hops
    const stmt = db.prepare(`
      WITH RECURSIVE related(id, distance) AS (
        SELECT ? as id, 0 as distance
        UNION
        SELECT 
          CASE 
            WHEN r.source_id = related.id THEN r.target_id
            ELSE r.source_id
          END as id,
          related.distance + 1
        FROM relations r
        JOIN related ON (r.source_id = related.id OR r.target_id = related.id)
        WHERE related.distance < ?
      )
      SELECT DISTINCT e.*
      FROM entities e
      JOIN related ON e.id = related.id
      WHERE related.distance > 0
      ORDER BY related.distance, e.importance_score DESC
    `);
    
    return stmt.all(entityId, depth) as Entity[];
  }

  async getObservations(entityId: string, limit: number = 10): Promise<Observation[]> {
    const db = this.ensureConnected();
    const stmt = db.prepare(`
      SELECT * FROM observations 
      WHERE entity_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    
    return stmt.all(entityId, limit) as Observation[];
  }

  async getRecentObservations(limit: number = 50): Promise<Observation[]> {
    const db = this.ensureConnected();
    const stmt = db.prepare(`
      SELECT o.*, e.name as entity_name
      FROM observations o
      JOIN entities e ON o.entity_id = e.id
      ORDER BY o.timestamp DESC
      LIMIT ?
    `);
    
    return stmt.all(limit) as Observation[];
  }

  async getEntityScore(entityId: string): Promise<number> {
    const db = this.ensureConnected();
    // Calculate composite score based on various factors
    const stmt = db.prepare(`
      SELECT 
        e.importance_score,
        e.access_count,
        e.last_accessed,
        COUNT(DISTINCT r.id) as relation_count,
        COUNT(DISTINCT o.id) as observation_count,
        MAX(o.timestamp) as last_observation
      FROM entities e
      LEFT JOIN relations r ON (r.source_id = e.id OR r.target_id = e.id)
      LEFT JOIN observations o ON o.entity_id = e.id
      WHERE e.id = ?
      GROUP BY e.id
    `);
    
    const data = stmt.get(entityId) as any;
    if (!data) return 0;
    
    // Simple scoring algorithm
    let score = data.importance_score * 50; // Base importance (0-50)
    
    // Recency boost (0-20)
    const daysSinceAccess = (Date.now() / 1000 - data.last_accessed) / 86400;
    const recencyScore = Math.max(0, 20 - daysSinceAccess);
    score += recencyScore;
    
    // Relationship boost (0-20)
    const relationScore = Math.min(20, data.relation_count * 2);
    score += relationScore;
    
    // Activity boost (0-10)
    const activityScore = Math.min(10, data.observation_count);
    score += activityScore;
    
    return Math.min(100, score);
  }

  getPerformanceMetrics() {
    return this.performanceMetrics;
  }
}