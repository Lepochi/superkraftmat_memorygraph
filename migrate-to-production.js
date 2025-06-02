#!/usr/bin/env node

import sqlite3 from 'sqlite3';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PRODUCTION_API = 'https://superkraftmatmemorygraph-production.up.railway.app/api/v2/memory';
const LOCAL_DB_PATH = path.join(__dirname, 'memory/database/superkraft.db');

async function migrateEntities() {
    console.log('🚀 Starting migration from local SQLite to production...');
    
    const db = new sqlite3.Database(LOCAL_DB_PATH);
    
    try {
        // Get all entities except the test one we created
        const entities = await new Promise((resolve, reject) => {
            db.all(`SELECT * FROM entities WHERE name != 'test-entity'`, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log(`📊 Found ${entities.length} entities to migrate`);
        
        let success = 0;
        let failed = 0;
        
        for (const entity of entities) {
            try {
                const payload = {
                    name: entity.name,
                    type: entity.type,
                    description: entity.description || '',
                    importance_score: entity.importance_score || 0.5,
                    metadata: entity.metadata ? JSON.parse(entity.metadata) : {}
                };
                
                const response = await axios.post(`${PRODUCTION_API}/entities`, payload, {
                    headers: { 'Content-Type': 'application/json' }
                });
                
                console.log(`✅ Migrated: ${entity.name} (${entity.type})`);
                success++;
                
                // Small delay to avoid overwhelming the API
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                console.error(`❌ Failed to migrate ${entity.name}:`, error.response?.data || error.message);
                failed++;
            }
        }
        
        console.log(`\n📈 Migration Summary:`);
        console.log(`   ✅ Success: ${success}`);
        console.log(`   ❌ Failed: ${failed}`);
        console.log(`   📊 Total: ${entities.length}`);
        
        // Verify final count
        const finalCheck = await axios.get(`${PRODUCTION_API}/entities`);
        console.log(`\n🔍 Production now has ${finalCheck.data.pagination.total} entities`);
        
    } catch (error) {
        console.error('💥 Migration failed:', error.message);
    } finally {
        db.close();
    }
}

migrateEntities();