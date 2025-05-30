const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

class DatabaseManager {
    constructor(dbPath = null) {
        this.dbPath = dbPath || path.join(__dirname, '../../../memory/database/superkraft.db');
        this.db = null;
        this.statements = {};
    }

    /**
     * Initialize database connection with optimizations
     */
    connect() {
        try {
            // Ensure directory exists
            const dir = path.dirname(this.dbPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            // Open database connection
            this.db = new Database(this.dbPath, {
                verbose: process.env.NODE_ENV === 'development' ? console.log : null
            });

            // Configure for optimal performance
            this.db.pragma('journal_mode = WAL'); // Write-Ahead Logging
            this.db.pragma('synchronous = NORMAL'); // Faster writes
            this.db.pragma('cache_size = -64000'); // 64MB cache
            this.db.pragma('temp_store = MEMORY'); // Use memory for temp tables
            this.db.pragma('mmap_size = 268435456'); // 256MB memory-mapped I/O
            
            // Initialize schema
            this.initializeSchema();
            
            // Prepare frequently used statements
            this.prepareStatements();
            
            console.log('Database connected successfully');
            return true;
        } catch (error) {
            console.error('Database connection failed:', error);
            throw error;
        }
    }

    /**
     * Initialize database schema
     */
    initializeSchema() {
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        // Execute schema in a transaction
        const transaction = this.db.transaction(() => {
            this.db.exec(schema);
        });
        
        transaction();
        console.log('Database schema initialized');
    }

    /**
     * Prepare commonly used statements for performance
     */
    prepareStatements() {
        this.statements = {
            // Entity operations
            insertEntity: this.db.prepare(`
                INSERT INTO entities (id, type, name, description, importance_score, metadata)
                VALUES (@id, @type, @name, @description, @importance_score, @metadata)
            `),
            
            updateEntity: this.db.prepare(`
                UPDATE entities 
                SET name = @name, description = @description, importance_score = @importance_score, 
                    metadata = @metadata, last_accessed = unixepoch()
                WHERE id = @id
            `),
            
            getEntity: this.db.prepare('SELECT * FROM entities WHERE id = ?'),
            
            searchEntities: this.db.prepare(`
                SELECT * FROM entities 
                WHERE name LIKE @search OR description LIKE @search
                ORDER BY importance_score DESC, updated_at DESC
                LIMIT @limit
            `),
            
            // Relation operations
            insertRelation: this.db.prepare(`
                INSERT INTO relations (source_id, target_id, type, strength, metadata)
                VALUES (@source_id, @target_id, @type, @strength, @metadata)
            `),
            
            getRelations: this.db.prepare(`
                SELECT r.*, 
                       e1.name as source_name, e1.type as source_type,
                       e2.name as target_name, e2.type as target_type
                FROM relations r
                JOIN entities e1 ON r.source_id = e1.id
                JOIN entities e2 ON r.target_id = e2.id
                WHERE r.source_id = @id OR r.target_id = @id
            `),
            
            // Observation operations
            insertObservation: this.db.prepare(`
                INSERT INTO observations (entity_id, content, context, importance)
                VALUES (@entity_id, @content, @context, @importance)
            `),
            
            getObservations: this.db.prepare(`
                SELECT * FROM observations 
                WHERE entity_id = @entity_id
                ORDER BY timestamp DESC
                LIMIT @limit
            `)
        };
    }

    /**
     * Close database connection
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            this.statements = {};
            console.log('Database connection closed');
        }
    }

    /**
     * Execute a transaction
     */
    transaction(callback) {
        return this.db.transaction(callback)();
    }

    /**
     * Get database statistics
     */
    getStats() {
        return {
            entities: this.db.prepare('SELECT COUNT(*) as count FROM entities').get().count,
            relations: this.db.prepare('SELECT COUNT(*) as count FROM relations').get().count,
            observations: this.db.prepare('SELECT COUNT(*) as count FROM observations').get().count,
            dbSize: fs.statSync(this.dbPath).size,
            walSize: fs.existsSync(this.dbPath + '-wal') ? fs.statSync(this.dbPath + '-wal').size : 0
        };
    }

    /**
     * Optimize database (VACUUM and ANALYZE)
     */
    optimize() {
        this.db.exec('VACUUM');
        this.db.exec('ANALYZE');
        console.log('Database optimized');
    }

    /**
     * Backup database
     */
    async backup(backupPath) {
        // better-sqlite3 backup API returns a promise
        await this.db.backup(backupPath);
        console.log(`Database backed up to ${backupPath}`);
    }
}

module.exports = DatabaseManager;