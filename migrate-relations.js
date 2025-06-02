#!/usr/bin/env node

import sqlite3 from 'sqlite3';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PRODUCTION_API = 'https://superkraftmatmemorygraph-production.up.railway.app/api/v2/memory';
const LOCAL_DB_PATH = path.join(__dirname, 'memory/database/superkraft.db');

async function migrateRelations() {
    console.log('🔗 Starting relations migration from local SQLite to production...');
    
    const db = new sqlite3.Database(LOCAL_DB_PATH);
    
    try {
        // Get all relations
        const relations = await new Promise((resolve, reject) => {
            db.all(`SELECT * FROM relations`, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log(`📊 Found ${relations.length} relations to migrate`);
        
        // Also get observations for context
        const observations = await new Promise((resolve, reject) => {
            db.all(`SELECT * FROM observations`, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log(`📝 Found ${observations.length} observations to migrate`);
        
        let relSuccess = 0;
        let relFailed = 0;
        let obsSuccess = 0;
        let obsFailed = 0;
        
        // Migrate relations first
        for (const relation of relations) {
            try {
                const payload = {
                    sourceId: relation.source_id,
                    targetId: relation.target_id,
                    type: relation.type || 'related_to',
                    strength: relation.strength || 0.5,
                    metadata: relation.metadata ? JSON.parse(relation.metadata) : {}
                };
                
                const response = await axios.post(`${PRODUCTION_API}/relations`, payload, {
                    headers: { 'Content-Type': 'application/json' }
                });
                
                console.log(`✅ Migrated relation: ${relation.source_id} → ${relation.target_id}`);
                relSuccess++;
                
                await new Promise(resolve => setTimeout(resolve, 50));
                
            } catch (error) {
                console.error(`❌ Failed to migrate relation ${relation.id}:`, error.response?.data || error.message);
                relFailed++;
            }
        }
        
        // Migrate observations
        for (const obs of observations) {
            try {
                const payload = {
                    content: obs.content,
                    importance: obs.importance || 0.5,
                    metadata: obs.metadata ? JSON.parse(obs.metadata) : {}
                };
                
                const response = await axios.post(`${PRODUCTION_API}/entities/${obs.entity_id}/observations`, payload, {
                    headers: { 'Content-Type': 'application/json' }
                });
                
                console.log(`✅ Migrated observation for entity: ${obs.entity_id}`);
                obsSuccess++;
                
                await new Promise(resolve => setTimeout(resolve, 50));
                
            } catch (error) {
                console.error(`❌ Failed to migrate observation ${obs.id}:`, error.response?.data || error.message);
                obsFailed++;
            }
        }
        
        console.log(`\n📈 Migration Summary:`);
        console.log(`   Relations - ✅ Success: ${relSuccess}, ❌ Failed: ${relFailed}`);
        console.log(`   Observations - ✅ Success: ${obsSuccess}, ❌ Failed: ${obsFailed}`);
        
        // Verify final counts
        const relCheck = await axios.get(`${PRODUCTION_API}/relations`);
        console.log(`\n🔍 Production now has ${relCheck.data.pagination?.total || relCheck.data.length} relations`);
        
    } catch (error) {
        console.error('💥 Migration failed:', error.message);
    } finally {
        db.close();
    }
}

migrateRelations();