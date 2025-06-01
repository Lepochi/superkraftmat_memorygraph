import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type { Entity, Relation, Observation } from '../types/memory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class DatabaseService {
  private db: Database.Database;
  
  constructor() {
    // Connect to the SQLite database
    const dbPath = join(__dirname, '../../../memory/database/superkraft.db');
    this.db = new Database(dbPath, { 
      readonly: false,
      fileMustExist: true
    });
    
    // Enable WAL mode for better concurrency
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('cache_size = -64000'); // 64MB cache
    this.db.pragma('mmap_size = 268435456'); // 256MB memory map
    
    // Prepare common statements
    this.prepareStatements();
  }

  private prepareStatements() {
    // We'll add prepared statements as needed
  }

  // Entity operations
  async getEntities(options: { types?: string[], minImportance?: number, limit?: number } = {}) {
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
    
    const stmt = this.db.prepare(query);
    return stmt.all(params) as Entity[];
  }

  async getEntity(id: string): Promise<Entity | null> {
    const stmt = this.db.prepare('SELECT * FROM entities WHERE id = ?');
    const entity = stmt.get(id) as Entity | undefined;
    
    if (entity) {
      // Update access tracking
      const updateStmt = this.db.prepare(
        'UPDATE entities SET last_accessed = unixepoch(), access_count = access_count + 1 WHERE id = ?'
      );
      updateStmt.run(id);
    }
    
    return entity || null;
  }

  async searchEntities(query: string, limit: number = 20): Promise<Entity[]> {
    const stmt = this.db.prepare(`
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

  // Relation operations
  async getRelations(entityId: string): Promise<Relation[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM relations 
      WHERE source_id = ? OR target_id = ?
      ORDER BY strength DESC
    `);
    
    return stmt.all(entityId, entityId) as Relation[];
  }

  async getRelatedEntities(entityId: string, depth: number = 1): Promise<Entity[]> {
    if (depth < 1) return [];
    
    // Recursive CTE to find entities within N hops
    const stmt = this.db.prepare(`
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

  // Observation operations
  async getObservations(entityId: string, limit: number = 10): Promise<Observation[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM observations 
      WHERE entity_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    
    return stmt.all(entityId, limit) as Observation[];
  }

  async getRecentObservations(limit: number = 50): Promise<Observation[]> {
    const stmt = this.db.prepare(`
      SELECT o.*, e.name as entity_name
      FROM observations o
      JOIN entities e ON o.entity_id = e.id
      ORDER BY o.timestamp DESC
      LIMIT ?
    `);
    
    return stmt.all(limit) as Observation[];
  }

  // Score operations
  async getEntityScore(entityId: string): Promise<number> {
    // Calculate composite score based on various factors
    const stmt = this.db.prepare(`
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
    
    // Simple scoring algorithm (can be enhanced)
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

  // Utility methods
  async updateEntity(id: string, updates: Partial<Entity>): Promise<void> {
    const fields = Object.keys(updates)
      .filter(key => key !== 'id')
      .map(key => `${key} = @${key}`)
      .join(', ');
    
    if (!fields) return;
    
    const stmt = this.db.prepare(`
      UPDATE entities 
      SET ${fields}, updated_at = unixepoch()
      WHERE id = @id
    `);
    
    stmt.run({ id, ...updates });
  }

  close() {
    this.db.close();
  }
}