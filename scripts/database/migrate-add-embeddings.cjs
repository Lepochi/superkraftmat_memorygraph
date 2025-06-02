#!/usr/bin/env node

/**
 * Migration script to add embedding column for semantic search
 */

const path = require('path');
const EmbeddingColumnMigration = require('../../backend/src/database/migration/addEmbeddingColumn');

async function runMigration() {
    console.log('🚀 Starting embedding column migration...');
    console.log('📍 Purpose: Add semantic search capability to memory system');
    
    const migration = new EmbeddingColumnMigration();
    
    try {
        // Check if migration is needed
        const isRequired = await migration.isRequired();
        
        if (!isRequired) {
            console.log('✅ Migration not needed - embedding column already exists');
            return;
        }
        
        // Run the migration
        console.log('🔄 Running migration...');
        const success = await migration.up();
        
        if (success) {
            console.log('🎉 Migration completed successfully!');
            console.log('');
            console.log('Next steps:');
            console.log('1. 🔑 Set OPENAI_API_KEY environment variable');
            console.log('2. 🧠 Generate embeddings: POST /api/v2/embeddings/generate');
            console.log('3. 🔍 Test semantic search: GET /api/v2/search?strategy=semantic&q=...');
            console.log('');
            console.log('Documentation:');
            console.log('- OpenAI API: https://platform.openai.com/docs/guides/embeddings');
            console.log('- Semantic search strategies: hybrid, semantic, traditional');
        } else {
            console.log('❌ Migration failed');
            process.exit(1);
        }
    } catch (error) {
        console.error('💥 Migration error:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    runMigration().catch(error => {
        console.error('💥 Script failed:', error);
        process.exit(1);
    });
}

module.exports = { runMigration };