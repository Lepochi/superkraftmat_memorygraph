const fs = require('fs');
const readline = require('readline');
const DatabaseManager = require('../DatabaseManager');

class MigrationValidator {
    constructor(jsonlPath, dbPath = null) {
        this.jsonlPath = jsonlPath;
        this.db = new DatabaseManager(dbPath);
        this.results = {
            jsonlData: {
                entities: new Set(),
                totalObservations: 0,
                entityTypes: new Map()
            },
            sqliteData: {
                entities: 0,
                observations: 0,
                relations: 0,
                entityTypes: new Map()
            },
            validation: {
                passed: true,
                issues: []
            }
        };
    }

    /**
     * Validate migration results
     */
    async validate() {
        console.log('🔍 Starting migration validation...\n');
        
        try {
            // Analyze JSONL file
            await this.analyzeJSONL();
            
            // Analyze SQLite database
            this.db.connect();
            this.analyzeSQLite();
            
            // Compare results
            this.compareData();
            
            // Print report
            this.printValidationReport();
            
            return this.results.validation.passed;
        } catch (error) {
            console.error('❌ Validation failed:', error);
            this.results.validation.passed = false;
            this.results.validation.issues.push({
                type: 'fatal',
                message: error.message
            });
            return false;
        } finally {
            this.db.close();
        }
    }

    /**
     * Analyze JSONL file
     */
    async analyzeJSONL() {
        return new Promise((resolve, reject) => {
            const fileStream = fs.createReadStream(this.jsonlPath);
            const rl = readline.createInterface({
                input: fileStream,
                crlfDelay: Infinity
            });

            rl.on('line', (line) => {
                try {
                    const data = JSON.parse(line);
                    
                    // Only count entities, not relations
                    if (data.type === 'entity') {
                        this.results.jsonlData.entities.add(data.name);
                        
                        // Count entity types
                        const type = data.entityType || 'unknown';
                        this.results.jsonlData.entityTypes.set(
                            type, 
                            (this.results.jsonlData.entityTypes.get(type) || 0) + 1
                        );
                        
                        // Count observations
                        if (data.observations && Array.isArray(data.observations)) {
                            this.results.jsonlData.totalObservations += data.observations.length;
                        }
                    }
                } catch (error) {
                    // Ignore parse errors for validation
                }
            });

            rl.on('error', reject);
            rl.on('close', resolve);
        });
    }

    /**
     * Analyze SQLite database
     */
    analyzeSQLite() {
        // Count entities
        const entityCount = this.db.db.prepare('SELECT COUNT(*) as count FROM entities').get();
        this.results.sqliteData.entities = entityCount.count;
        
        // Count observations
        const obsCount = this.db.db.prepare('SELECT COUNT(*) as count FROM observations').get();
        this.results.sqliteData.observations = obsCount.count;
        
        // Count relations
        const relCount = this.db.db.prepare('SELECT COUNT(*) as count FROM relations').get();
        this.results.sqliteData.relations = relCount.count;
        
        // Count entity types
        const entityTypes = this.db.db.prepare('SELECT type, COUNT(*) as count FROM entities GROUP BY type').all();
        entityTypes.forEach(row => {
            this.results.sqliteData.entityTypes.set(row.type, row.count);
        });
        
        // Check for data integrity
        this.checkDataIntegrity();
    }

    /**
     * Check data integrity in SQLite
     */
    checkDataIntegrity() {
        // Check for orphaned observations
        const orphanedObs = this.db.db.prepare(`
            SELECT COUNT(*) as count FROM observations o
            LEFT JOIN entities e ON o.entity_id = e.id
            WHERE e.id IS NULL
        `).get();
        
        if (orphanedObs.count > 0) {
            this.results.validation.issues.push({
                type: 'integrity',
                message: `Found ${orphanedObs.count} orphaned observations`
            });
        }
        
        // Check for orphaned relations
        const orphanedRels = this.db.db.prepare(`
            SELECT COUNT(*) as count FROM relations r
            LEFT JOIN entities e1 ON r.source_id = e1.id
            LEFT JOIN entities e2 ON r.target_id = e2.id
            WHERE e1.id IS NULL OR e2.id IS NULL
        `).get();
        
        if (orphanedRels.count > 0) {
            this.results.validation.issues.push({
                type: 'integrity',
                message: `Found ${orphanedRels.count} orphaned relations`
            });
        }
        
        // Check for duplicate entities by name
        const duplicates = this.db.db.prepare(`
            SELECT name, COUNT(*) as count FROM entities
            GROUP BY name HAVING count > 1
        `).all();
        
        if (duplicates.length > 0) {
            this.results.validation.issues.push({
                type: 'integrity',
                message: `Found ${duplicates.length} duplicate entity names`,
                details: duplicates
            });
        }
    }

    /**
     * Compare JSONL and SQLite data
     */
    compareData() {
        // Compare entity counts
        if (this.results.jsonlData.entities.size !== this.results.sqliteData.entities) {
            this.results.validation.issues.push({
                type: 'count_mismatch',
                message: `Entity count mismatch: JSONL has ${this.results.jsonlData.entities.size}, SQLite has ${this.results.sqliteData.entities}`
            });
            this.results.validation.passed = false;
        }
        
        // Compare observation counts
        if (this.results.jsonlData.totalObservations !== this.results.sqliteData.observations) {
            this.results.validation.issues.push({
                type: 'count_mismatch',
                message: `Observation count mismatch: JSONL has ${this.results.jsonlData.totalObservations}, SQLite has ${this.results.sqliteData.observations}`
            });
            // This is a warning, not a failure (some observations might be filtered)
        }
        
        // Check for missing entities
        const sqliteEntities = this.db.db.prepare('SELECT name FROM entities').all();
        const sqliteEntityNames = new Set(sqliteEntities.map(e => e.name));
        
        const missingEntities = [];
        this.results.jsonlData.entities.forEach(name => {
            if (!sqliteEntityNames.has(name)) {
                missingEntities.push(name);
            }
        });
        
        if (missingEntities.length > 0) {
            this.results.validation.issues.push({
                type: 'missing_entities',
                message: `${missingEntities.length} entities from JSONL not found in SQLite`,
                details: missingEntities.slice(0, 5)
            });
            this.results.validation.passed = false;
        }
    }

    /**
     * Print validation report
     */
    printValidationReport() {
        console.log('\n📊 Validation Report');
        console.log('═══════════════════════════════════════');
        
        console.log('\n📄 JSONL Data:');
        console.log(`   Entities: ${this.results.jsonlData.entities.size}`);
        console.log(`   Observations: ${this.results.jsonlData.totalObservations}`);
        console.log('   Entity Types:');
        this.results.jsonlData.entityTypes.forEach((count, type) => {
            console.log(`     - ${type}: ${count}`);
        });
        
        console.log('\n💾 SQLite Data:');
        console.log(`   Entities: ${this.results.sqliteData.entities}`);
        console.log(`   Observations: ${this.results.sqliteData.observations}`);
        console.log(`   Relations: ${this.results.sqliteData.relations}`);
        console.log('   Entity Types:');
        this.results.sqliteData.entityTypes.forEach((count, type) => {
            console.log(`     - ${type}: ${count}`);
        });
        
        if (this.results.validation.issues.length > 0) {
            console.log('\n⚠️  Issues Found:');
            this.results.validation.issues.forEach(issue => {
                console.log(`   - ${issue.type}: ${issue.message}`);
                if (issue.details && issue.details.length > 0) {
                    console.log(`     Details: ${JSON.stringify(issue.details.slice(0, 3))}...`);
                }
            });
        }
        
        console.log('\n' + (this.results.validation.passed ? '✅ Validation PASSED' : '❌ Validation FAILED'));
    }
}

module.exports = MigrationValidator;