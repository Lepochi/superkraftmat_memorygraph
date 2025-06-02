/**
 * Migration to add embedding column to entities table
 */

const DatabaseManager = require('../DatabaseManager');

class EmbeddingColumnMigration {
    constructor() {
        this.name = 'add_embedding_column';
        this.description = 'Add embedding column to entities table for semantic search';
    }

    /**
     * Run the migration
     */
    async up() {
        console.log('🔄 Running migration: Add embedding column to entities table');
        
        const dbManager = new DatabaseManager();
        dbManager.connect();
        const db = dbManager.db;
        
        try {
            // Check if column already exists
            const tableInfo = db.prepare("PRAGMA table_info(entities)").all();
            const hasEmbeddingColumn = tableInfo.some(column => column.name === 'embedding');
            
            if (hasEmbeddingColumn) {
                console.log('✅ Embedding column already exists, skipping migration');
                return true;
            }

            // Add the embedding column
            db.exec('ALTER TABLE entities ADD COLUMN embedding TEXT');
            
            // Create index for performance
            db.exec('CREATE INDEX IF NOT EXISTS idx_entities_embedding ON entities(embedding) WHERE embedding IS NOT NULL');
            
            console.log('✅ Migration completed: Embedding column added successfully');
            console.log('📊 Entities ready for semantic search capability');
            
            return true;
        } catch (error) {
            console.error('❌ Migration failed:', error);
            throw error;
        } finally {
            dbManager.close();
        }
    }

    /**
     * Rollback the migration
     */
    async down() {
        console.log('🔄 Rolling back migration: Remove embedding column');
        
        const dbManager = new DatabaseManager();
        const db = dbManager.getDatabase();
        
        try {
            // SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
            console.log('⚠️  SQLite limitation: Cannot drop column directly');
            console.log('💡 Manual rollback required: recreate entities table without embedding column');
            
            // For safety, we'll just log what needs to be done rather than actually modifying
            console.log('Rollback steps:');
            console.log('1. Create backup of entities table');
            console.log('2. Create new entities table without embedding column');
            console.log('3. Copy data excluding embedding column');
            console.log('4. Drop old table and rename new table');
            
            return false; // Indicate manual intervention needed
        } catch (error) {
            console.error('❌ Rollback failed:', error);
            throw error;
        } finally {
            dbManager.close();
        }
    }

    /**
     * Check if migration is needed
     */
    async isRequired() {
        const dbManager = new DatabaseManager();
        dbManager.connect();
        const db = dbManager.db;
        
        try {
            const tableInfo = db.prepare("PRAGMA table_info(entities)").all();
            const hasEmbeddingColumn = tableInfo.some(column => column.name === 'embedding');
            return !hasEmbeddingColumn;
        } catch (error) {
            console.error('❌ Failed to check migration status:', error);
            return false;
        } finally {
            dbManager.close();
        }
    }
}

module.exports = EmbeddingColumnMigration;