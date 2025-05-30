/**
 * Base Repository class providing common database operations
 * All other repositories extend this class
 */
class BaseRepository {
    constructor(db, tableName) {
        this.db = db;
        this.tableName = tableName;
    }

    /**
     * Find a record by ID
     */
    findById(id) {
        const query = `SELECT * FROM ${this.tableName} WHERE id = ?`;
        return this.db.prepare(query).get(id);
    }

    /**
     * Find all records
     */
    findAll(limit = 100, offset = 0) {
        const query = `SELECT * FROM ${this.tableName} LIMIT ? OFFSET ?`;
        return this.db.prepare(query).all(limit, offset);
    }

    /**
     * Count total records
     */
    count() {
        const query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
        return this.db.prepare(query).get().count;
    }

    /**
     * Delete a record by ID
     */
    delete(id) {
        const query = `DELETE FROM ${this.tableName} WHERE id = ?`;
        const result = this.db.prepare(query).run(id);
        return result.changes > 0;
    }

    /**
     * Execute a transaction
     */
    transaction(callback) {
        return this.db.transaction(callback)();
    }

    /**
     * Helper to build WHERE clauses
     */
    buildWhereClause(conditions) {
        const clauses = [];
        const params = {};
        
        for (const [key, value] of Object.entries(conditions)) {
            if (value !== undefined && value !== null) {
                clauses.push(`${key} = @${key}`);
                params[key] = value;
            }
        }
        
        return {
            clause: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
            params
        };
    }

    /**
     * Helper to format dates
     */
    formatDate(timestamp) {
        return new Date(timestamp * 1000).toISOString();
    }

    /**
     * Helper to parse JSON safely
     */
    parseJSON(jsonString, defaultValue = {}) {
        try {
            return jsonString ? JSON.parse(jsonString) : defaultValue;
        } catch {
            return defaultValue;
        }
    }
}

module.exports = BaseRepository;