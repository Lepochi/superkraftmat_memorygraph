#!/usr/bin/env node

/**
 * Simple script to add embedding column to entities table
 */

const Database = require('better-sqlite3');
const path = require('path');

function addEmbeddingColumn() {
    console.log('🚀 Adding embedding column to entities table...');
    
    const dbPath = path.join(__dirname, '../../memory/database/superkraft.db');
    console.log('📍 Database:', dbPath);
    
    let db;
    
    try {
        // Open database connection
        db = new Database(dbPath);
        
        // Check if column already exists
        const tableInfo = db.prepare("PRAGMA table_info(entities)").all();
        const hasEmbeddingColumn = tableInfo.some(column => column.name === 'embedding');
        
        if (hasEmbeddingColumn) {
            console.log('✅ Embedding column already exists, skipping migration');
            return;
        }
        
        console.log('🔄 Adding embedding column...');
        
        // Add the embedding column
        db.exec('ALTER TABLE entities ADD COLUMN embedding TEXT');
        
        // Create index for performance
        db.exec('CREATE INDEX IF NOT EXISTS idx_entities_embedding ON entities(embedding) WHERE embedding IS NOT NULL');
        
        console.log('✅ Migration completed successfully!');
        console.log('');
        console.log('📊 Semantic search capability enabled');
        console.log('');
        console.log('Next steps:');
        console.log('1. 🔑 Set OPENAI_API_KEY environment variable');
        console.log('2. 🚀 Start backend: cd backend && USE_SQLITE=true npm run dev');
        console.log('3. 🧠 Generate embeddings: POST /api/v2/embeddings/generate');
        console.log('4. 🔍 Test semantic search: GET /api/v2/search?strategy=semantic&q=...');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        if (db) {
            db.close();
        }
    }
}

// Run if called directly
if (require.main === module) {
    addEmbeddingColumn();
}

module.exports = { addEmbeddingColumn };