#!/usr/bin/env node
const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');

// Database path
const dbPath = path.join(__dirname, '../memory/database/superkraft.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

console.log('Updating memory database with Phase 4 progress...');

// Prepare statements
const insertEntity = db.prepare(`
    INSERT INTO entities (id, type, name, description, importance_score, metadata)
    VALUES (?, ?, ?, ?, ?, ?)
`);

const insertObservation = db.prepare(`
    INSERT INTO observations (entity_id, content, importance)
    VALUES (?, ?, ?)
`);

const insertRelation = db.prepare(`
    INSERT INTO relations (source_id, target_id, type, strength, metadata)
    VALUES (?, ?, ?, ?, ?)
`);

// Create entities for Phase 4 progress
const phase4Entities = [
    {
        id: crypto.randomUUID(),
        type: 'task',
        name: 'Phase 4.1 REST API v2',
        description: 'v2 REST API implementation with pagination, filtering, and metadata support',
        importance: 0.9,
        observations: [
            'Completed May 30, 2025',
            'Created /api/v2/memory/* endpoints with full CRUD operations',
            'Implemented pagination, filtering, and sorting',
            'Added API versioning with deprecation headers',
            'Performance verified at <10ms query time'
        ]
    },
    {
        id: crypto.randomUUID(),
        type: 'task',
        name: 'Phase 4.2 Frontend Integration',
        description: 'Canvas UI updated to use v2 API with optimistic updates',
        importance: 0.85,
        observations: [
            'Completed May 30, 2025',
            'Created memoryApiV2.js with dual v1/v2 support',
            'Added API version toggle in UI',
            'Implemented optimistic updates with rollback',
            'Added shimmer animations for pending operations'
        ]
    },
    {
        id: crypto.randomUUID(),
        type: 'concept',
        name: 'Optimistic UI Updates',
        description: 'Frontend pattern for immediate UI updates with server sync',
        importance: 0.8,
        observations: [
            'Shows changes immediately in UI before server confirmation',
            'Rollback capability if server operation fails',
            'Visual feedback with shimmer animation',
            'Improves perceived performance significantly'
        ]
    },
    {
        id: crypto.randomUUID(),
        type: 'concept',
        name: 'API Version Migration',
        description: 'Strategy for migrating from v1 to v2 API while maintaining compatibility',
        importance: 0.75,
        observations: [
            'URL-based versioning (/api/v1 and /api/v2)',
            'Automatic format conversion between versions',
            'Name-to-ID mapping for entity references',
            'Toggle switch for easy testing'
        ]
    }
];

// Find related entities
const findEntityByName = db.prepare('SELECT id FROM entities WHERE name = ?');
const memorySystemId = findEntityByName.get('Memory_System')?.id;
const mcpServerId = findEntityByName.get('Superkraft MCP Server')?.id;
const phase4TodoId = findEntityByName.get('Phase 4 - API Integration TODO')?.id;

// Insert in transaction
const transaction = db.transaction(() => {
    // Insert new entities
    phase4Entities.forEach(entity => {
        insertEntity.run(
            entity.id,
            entity.type,
            entity.name,
            entity.description,
            entity.importance,
            JSON.stringify({ phase: 4, completedDate: '2025-05-30' })
        );
        
        // Add observations
        entity.observations.forEach((obs, index) => {
            insertObservation.run(entity.id, obs, 0.7 - (index * 0.1));
        });
    });
    
    // Create relations
    if (memorySystemId) {
        // Link Phase 4 tasks to Memory System
        insertRelation.run(
            phase4Entities[0].id,
            memorySystemId,
            'part_of',
            0.9,
            JSON.stringify({ phase: '4.1' })
        );
        
        insertRelation.run(
            phase4Entities[1].id,
            memorySystemId,
            'part_of',
            0.9,
            JSON.stringify({ phase: '4.2' })
        );
    }
    
    if (mcpServerId) {
        // Link API v2 to MCP Server
        insertRelation.run(
            phase4Entities[0].id,
            mcpServerId,
            'supports',
            0.8,
            JSON.stringify({ integration: 'API layer' })
        );
    }
    
    if (phase4TodoId) {
        // Mark Phase 4 TODO as partially complete
        const updateEntity = db.prepare(`
            UPDATE entities 
            SET description = ?, importance_score = ?, metadata = ?
            WHERE id = ?
        `);
        
        updateEntity.run(
            'Phase 4 API & Integration Layer - 70% COMPLETE (v2 API done, Frontend integrated)',
            0.7,
            JSON.stringify({ 
                status: 'in_progress',
                completed: ['4.1 REST API', '4.2 Frontend Integration'],
                remaining: ['4.3 WebSocket support', '4.4 Conflict resolution']
            }),
            phase4TodoId
        );
    }
    
    // Add relations between new entities
    insertRelation.run(
        phase4Entities[2].id, // Optimistic UI
        phase4Entities[1].id, // Frontend Integration
        'part_of',
        0.85,
        JSON.stringify({ type: 'implementation pattern' })
    );
    
    insertRelation.run(
        phase4Entities[3].id, // API Migration
        phase4Entities[0].id, // REST API v2
        'supports',
        0.8,
        JSON.stringify({ type: 'migration strategy' })
    );
});

try {
    transaction();
    console.log('✅ Memory database updated successfully!');
    console.log(`Added ${phase4Entities.length} new entities with observations and relations`);
} catch (error) {
    console.error('❌ Error updating memory:', error);
} finally {
    db.close();
}