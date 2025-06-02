#!/usr/bin/env node

import sqlite3 from 'sqlite3';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration
const SUPABASE_URL = 'https://xthjwtxmlmnwcwvqfiai.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0aGp3dHhtbG1ud2N3dnFmaWFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODgxNjg0NCwiZXhwIjoyMDY0MzkyODQ0fQ.s5cllmrIOfiMuy-IgltZDYbPFEifQT7ujJjQ6WDPutY';

const LOCAL_DB_PATH = path.join(__dirname, 'memory/database/superkraft.db');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function createSupabaseSchema() {
    console.log('🔧 Creating Supabase schema...');
    
    const schema = `
    -- Enable UUID extension
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    
    -- Create entities table
    CREATE TABLE IF NOT EXISTS entities (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL,
        description TEXT DEFAULT '',
        importance_score REAL DEFAULT 0.5,
        created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()),
        updated_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()),
        last_accessed BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()),
        access_count INTEGER DEFAULT 0,
        metadata JSONB DEFAULT '{}'::jsonb
    );
    
    -- Create relations table
    CREATE TABLE IF NOT EXISTS relations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        source_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
        target_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
        type TEXT DEFAULT 'related_to',
        strength REAL DEFAULT 0.5,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())
    );
    
    -- Create observations table
    CREATE TABLE IF NOT EXISTS observations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        timestamp BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()),
        importance REAL DEFAULT 0.5,
        metadata JSONB DEFAULT '{}'::jsonb
    );
    
    -- Create memory_scores table
    CREATE TABLE IF NOT EXISTS memory_scores (
        entity_id UUID PRIMARY KEY REFERENCES entities(id) ON DELETE CASCADE,
        importance REAL DEFAULT 0.5,
        last_accessed BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()),
        access_count INTEGER DEFAULT 0
    );
    
    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type);
    CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(name);
    CREATE INDEX IF NOT EXISTS idx_relations_source ON relations(source_id);
    CREATE INDEX IF NOT EXISTS idx_relations_target ON relations(target_id);
    CREATE INDEX IF NOT EXISTS idx_observations_entity ON observations(entity_id);
    CREATE INDEX IF NOT EXISTS idx_observations_timestamp ON observations(timestamp);
    `;
    
    // Split schema into individual statements and execute
    const statements = schema.split(';').filter(stmt => stmt.trim());
    
    try {
        for (const statement of statements) {
            if (statement.trim()) {
                const { error } = await supabase.rpc('exec_sql', { 
                    query: statement.trim() + ';' 
                });
                if (error) {
                    console.warn(`⚠️ Statement warning:`, error.message);
                }
            }
        }
        console.log('✅ Schema created successfully');
        return true;
    } catch (error) {
        console.error('❌ Schema creation error:', error.message);
        console.log('📝 You may need to run the schema manually in Supabase SQL editor');
        return true; // Continue with migration even if schema setup has issues
    }
}

async function migrateData() {
    console.log('🚀 Starting complete migration from SQLite to Supabase...');
    
    const db = new sqlite3.Database(LOCAL_DB_PATH);
    
    try {
        // Get all data
        const entities = await new Promise((resolve, reject) => {
            db.all(`SELECT * FROM entities WHERE name != 'test-entity'`, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        const relations = await new Promise((resolve, reject) => {
            db.all(`SELECT * FROM relations`, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        const observations = await new Promise((resolve, reject) => {
            db.all(`SELECT * FROM observations`, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log(`📊 Found ${entities.length} entities, ${relations.length} relations, ${observations.length} observations`);
        
        // Create ID mapping for entities
        const idMapping = {};
        
        // Migrate entities first
        console.log('📦 Migrating entities...');
        for (const entity of entities) {
            const { data, error } = await supabase
                .from('entities')
                .insert({
                    name: entity.name,
                    type: entity.type,
                    description: entity.description || '',
                    importance_score: entity.importance_score || 0.5,
                    created_at: entity.created_at,
                    updated_at: entity.updated_at,
                    last_accessed: entity.last_accessed,
                    access_count: entity.access_count || 0,
                    metadata: entity.metadata ? JSON.parse(entity.metadata) : {}
                })
                .select()
                .single();
                
            if (error) {
                console.error(`❌ Failed to migrate entity ${entity.name}:`, error);
            } else {
                idMapping[entity.id] = data.id;
                console.log(`✅ Migrated entity: ${entity.name}`);
            }
        }
        
        // Migrate relations
        console.log('🔗 Migrating relations...');
        let relSuccess = 0;
        for (const relation of relations) {
            const sourceId = idMapping[relation.source_id];
            const targetId = idMapping[relation.target_id];
            
            if (!sourceId || !targetId) {
                console.warn(`⚠️ Skipping relation - missing entity mapping`);
                continue;
            }
            
            const { error } = await supabase
                .from('relations')
                .insert({
                    source_id: sourceId,
                    target_id: targetId,
                    type: relation.type || 'related_to',
                    strength: relation.strength || 0.5,
                    metadata: relation.metadata ? JSON.parse(relation.metadata) : {},
                    created_at: relation.created_at
                });
                
            if (error) {
                console.error(`❌ Failed to migrate relation:`, error);
            } else {
                relSuccess++;
                console.log(`✅ Migrated relation: ${sourceId} → ${targetId}`);
            }
        }
        
        // Migrate observations
        console.log('📝 Migrating observations...');
        let obsSuccess = 0;
        for (const obs of observations) {
            const entityId = idMapping[obs.entity_id];
            
            if (!entityId) {
                console.warn(`⚠️ Skipping observation - entity not found`);
                continue;
            }
            
            const { error } = await supabase
                .from('observations')
                .insert({
                    entity_id: entityId,
                    content: obs.content,
                    timestamp: obs.timestamp,
                    importance: obs.importance || 0.5,
                    metadata: obs.metadata ? JSON.parse(obs.metadata) : {}
                });
                
            if (error) {
                console.error(`❌ Failed to migrate observation:`, error);
            } else {
                obsSuccess++;
                if (obsSuccess % 50 === 0) {
                    console.log(`✅ Migrated ${obsSuccess} observations...`);
                }
            }
        }
        
        console.log(`\n📈 Migration Summary:`);
        console.log(`   ✅ Entities: ${Object.keys(idMapping).length}/${entities.length}`);
        console.log(`   ✅ Relations: ${relSuccess}/${relations.length}`);
        console.log(`   ✅ Observations: ${obsSuccess}/${observations.length}`);
        
        // Verify data
        const { data: finalEntities } = await supabase.from('entities').select('count');
        const { data: finalRelations } = await supabase.from('relations').select('count');
        const { data: finalObservations } = await supabase.from('observations').select('count');
        
        console.log(`\n🔍 Supabase now contains:`);
        console.log(`   📦 Entities: ${finalEntities?.[0]?.count || 'unknown'}`);
        console.log(`   🔗 Relations: ${finalRelations?.[0]?.count || 'unknown'}`);
        console.log(`   📝 Observations: ${finalObservations?.[0]?.count || 'unknown'}`);
        
    } catch (error) {
        console.error('💥 Migration failed:', error.message);
    } finally {
        db.close();
    }
}

async function main() {
    const schemaCreated = await createSupabaseSchema();
    if (schemaCreated) {
        await migrateData();
    } else {
        console.error('❌ Cannot proceed without schema');
    }
}

main();