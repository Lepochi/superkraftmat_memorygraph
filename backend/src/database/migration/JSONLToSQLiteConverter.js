const fs = require('fs');
const path = require('path');
const readline = require('readline');
const crypto = require('crypto');
const DatabaseManager = require('../DatabaseManager');

class JSONLToSQLiteConverter {
    constructor(jsonlPath, dbPath = null) {
        this.jsonlPath = jsonlPath;
        this.dbPath = dbPath;
        this.db = new DatabaseManager(dbPath);
        this.stats = {
            totalLines: 0,
            entitiesCreated: 0,
            relationsCreated: 0,
            observationsCreated: 0,
            errors: [],
            startTime: null,
            endTime: null
        };
        this.entityIdMap = new Map(); // Maps old entity names to new UUIDs
    }

    /**
     * Main migration method
     */
    async migrate() {
        console.log('🚀 Starting JSONL to SQLite migration...\n');
        this.stats.startTime = Date.now();
        
        try {
            // Connect to database
            this.db.connect();
            
            // Create backup
            const backupPath = await this.createBackup();
            console.log(`✅ Backup created: ${backupPath}\n`);
            
            // Process JSONL file
            await this.processJSONLFile();
            
            // Create relations from entity observations
            await this.extractRelations();
            
            // Finalize
            this.stats.endTime = Date.now();
            this.printReport();
            
            return this.stats;
        } catch (error) {
            console.error('❌ Migration failed:', error);
            this.stats.errors.push({
                type: 'fatal',
                message: error.message,
                stack: error.stack
            });
            throw error;
        } finally {
            this.db.close();
        }
    }

    /**
     * Create a backup of current database if it exists
     */
    async createBackup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(path.dirname(this.jsonlPath), '../backups');
        
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        const backupPath = path.join(backupDir, `pre-migration-${timestamp}.db`);
        
        if (fs.existsSync(this.db.dbPath)) {
            await this.db.backup(backupPath);
        }
        
        return backupPath;
    }

    /**
     * Process the JSONL file line by line
     */
    async processJSONLFile() {
        return new Promise((resolve, reject) => {
            const fileStream = fs.createReadStream(this.jsonlPath);
            const rl = readline.createInterface({
                input: fileStream,
                crlfDelay: Infinity
            });

            rl.on('line', (line) => {
                this.stats.totalLines++;
                try {
                    const data = JSON.parse(line);
                    // Only process entity types, skip relations
                    if (data.type === 'entity') {
                        this.processEntity(data);
                    } else if (data.type === 'relation') {
                        this.processRelation(data);
                    }
                } catch (error) {
                    this.stats.errors.push({
                        type: 'parse',
                        line: this.stats.totalLines,
                        message: error.message,
                        data: line
                    });
                }
            });

            rl.on('error', reject);
            rl.on('close', resolve);
        });
    }

    /**
     * Process a single entity from JSONL
     */
    processEntity(data) {
        try {
            // Generate or retrieve entity ID
            const entityId = this.getOrCreateEntityId(data.name);
            
            // Map entityType to our schema types
            const typeMap = {
                'company': 'concept',
                'project': 'task',
                'system': 'concept',
                'checkpoint': 'event',
                'task': 'task',
                'reference': 'concept',
                'Person': 'person'
            };
            
            const entityType = typeMap[data.entityType] || 'concept';
            
            // Calculate importance based on observations count and type
            const importanceScore = this.calculateImportance(data);
            
            // Insert entity
            this.db.transaction(() => {
                // Insert or update entity
                try {
                    this.db.statements.insertEntity.run({
                        id: entityId,
                        type: entityType,
                        name: data.name,
                        description: data.observations ? data.observations[0] : '',
                        importance_score: importanceScore,
                        metadata: JSON.stringify({
                            originalType: data.entityType,
                            migrated: true,
                            migratedAt: new Date().toISOString()
                        })
                    });
                    this.stats.entitiesCreated++;
                } catch (error) {
                    if (error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
                        // Entity exists, update it
                        this.db.statements.updateEntity.run({
                            id: entityId,
                            name: data.name,
                            description: data.observations ? data.observations[0] : '',
                            importance_score: importanceScore,
                            metadata: JSON.stringify({
                                originalType: data.entityType,
                                migrated: true,
                                migratedAt: new Date().toISOString()
                            })
                        });
                    } else {
                        throw error;
                    }
                }
                
                // Insert observations
                if (data.observations && Array.isArray(data.observations)) {
                    data.observations.forEach((observation, index) => {
                        this.db.statements.insertObservation.run({
                            entity_id: entityId,
                            content: observation,
                            context: JSON.stringify({
                                source: 'jsonl_migration',
                                originalIndex: index
                            }),
                            importance: 0.5 + (index === 0 ? 0.2 : 0) // First observation is more important
                        });
                        this.stats.observationsCreated++;
                    });
                }
            });
            
        } catch (error) {
            this.stats.errors.push({
                type: 'entity',
                entity: data.name,
                message: error.message
            });
        }
    }

    /**
     * Process a relation from JSONL
     */
    processRelation(data) {
        try {
            const sourceId = this.getOrCreateEntityId(data.from);
            const targetId = this.getOrCreateEntityId(data.to);
            
            // Map relation types
            const typeMap = {
                'uses': 'requires',
                'includes': 'part_of',
                'organized_by': 'part_of',
                'tracked_by': 'relates_to',
                'documented_by': 'relates_to',
                'defines_structure_for': 'supports',
                'informs': 'supports',
                'implements': 'relates_to',
                'based_on': 'requires'
            };
            
            const relationType = typeMap[data.relationType] || 'relates_to';
            
            this.db.transaction(() => {
                try {
                    this.db.statements.insertRelation.run({
                        source_id: sourceId,
                        target_id: targetId,
                        type: relationType,
                        strength: 0.7,
                        metadata: JSON.stringify({
                            originalType: data.relationType,
                            migrated: true
                        })
                    });
                    this.stats.relationsCreated++;
                } catch (error) {
                    if (error.code !== 'SQLITE_CONSTRAINT') {
                        throw error;
                    }
                }
            });
        } catch (error) {
            this.stats.errors.push({
                type: 'relation',
                message: error.message,
                data: data
            });
        }
    }

    /**
     * Extract relations from entity observations
     */
    async extractRelations() {
        console.log('🔍 Extracting relations from observations...\n');
        
        // Get all entities
        const entities = this.db.db.prepare('SELECT * FROM entities').all();
        
        entities.forEach(entity => {
            // Get observations for this entity
            const observations = this.db.statements.getObservations.all({
                entity_id: entity.id,
                limit: 100
            });
            
            observations.forEach(obs => {
                // Look for mentions of other entities
                entities.forEach(otherEntity => {
                    if (entity.id !== otherEntity.id && 
                        obs.content.toLowerCase().includes(otherEntity.name.toLowerCase())) {
                        
                        try {
                            this.db.statements.insertRelation.run({
                                source_id: entity.id,
                                target_id: otherEntity.id,
                                type: 'relates_to',
                                strength: 0.5,
                                metadata: JSON.stringify({
                                    extracted: true,
                                    observation_id: obs.id
                                })
                            });
                            this.stats.relationsCreated++;
                        } catch (error) {
                            // Ignore duplicate relations
                            if (error.code !== 'SQLITE_CONSTRAINT') {
                                this.stats.errors.push({
                                    type: 'relation',
                                    message: error.message,
                                    source: entity.name,
                                    target: otherEntity.name
                                });
                            }
                        }
                    }
                });
            });
        });
    }

    /**
     * Generate or retrieve entity ID
     */
    getOrCreateEntityId(entityName) {
        if (this.entityIdMap.has(entityName)) {
            return this.entityIdMap.get(entityName);
        }
        
        const id = crypto.randomUUID();
        this.entityIdMap.set(entityName, id);
        return id;
    }

    /**
     * Calculate importance score based on entity data
     */
    calculateImportance(data) {
        let score = 0.5; // Base score
        
        // More observations = more important
        if (data.observations) {
            score += Math.min(data.observations.length * 0.05, 0.3);
        }
        
        // Certain types are inherently more important
        const importantTypes = ['company', 'Person', 'project', 'checkpoint'];
        if (importantTypes.includes(data.entityType)) {
            score += 0.2;
        }
        
        return Math.min(score, 1.0);
    }

    /**
     * Print migration report
     */
    printReport() {
        const duration = ((this.stats.endTime - this.stats.startTime) / 1000).toFixed(2);
        
        console.log('\n📊 Migration Report');
        console.log('═══════════════════════════════════════');
        console.log(`✅ Total lines processed: ${this.stats.totalLines}`);
        console.log(`✅ Entities created: ${this.stats.entitiesCreated}`);
        console.log(`✅ Observations created: ${this.stats.observationsCreated}`);
        console.log(`✅ Relations extracted: ${this.stats.relationsCreated}`);
        console.log(`⏱️  Duration: ${duration} seconds`);
        
        if (this.stats.errors.length > 0) {
            console.log(`\n⚠️  Errors encountered: ${this.stats.errors.length}`);
            this.stats.errors.slice(0, 5).forEach(error => {
                console.log(`   - ${error.type}: ${error.message}`);
            });
            if (this.stats.errors.length > 5) {
                console.log(`   ... and ${this.stats.errors.length - 5} more`);
            }
        }
        
        console.log('\n✅ Migration completed successfully!');
    }
}

module.exports = JSONLToSQLiteConverter;