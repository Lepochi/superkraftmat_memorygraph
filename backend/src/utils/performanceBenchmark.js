const { performance } = require('perf_hooks');
const crypto = require('crypto');

/**
 * Performance Benchmark Utility for Superkraft Memory System
 * 
 * Tests system performance with large datasets and concurrent operations
 */
class PerformanceBenchmark {
    constructor(repositoryManager) {
        this.repos = repositoryManager;
        this.results = {
            entityOperations: {},
            searchOperations: {},
            relationOperations: {},
            concurrentOperations: {},
            embeddingOperations: {}
        };
    }

    /**
     * Run complete benchmark suite
     */
    async runFullBenchmark(options = {}) {
        const {
            entityCount = 10000,
            relationCount = 20000,
            searchIterations = 100,
            concurrentUsers = 50
        } = options;

        console.log('🚀 Starting Performance Benchmark');
        console.log(`📊 Parameters: ${entityCount} entities, ${relationCount} relations, ${concurrentUsers} concurrent users`);

        try {
            // Test 1: Bulk entity creation
            await this.benchmarkBulkEntityCreation(entityCount);
            
            // Test 2: Bulk relation creation
            await this.benchmarkBulkRelationCreation(relationCount);
            
            // Test 3: Search performance
            await this.benchmarkSearchOperations(searchIterations);
            
            // Test 4: Concurrent operations
            await this.benchmarkConcurrentOperations(concurrentUsers);
            
            // Test 5: Embedding operations
            await this.benchmarkEmbeddingOperations(1000);
            
            // Generate report
            return this.generateReport();
        } catch (error) {
            console.error('❌ Benchmark failed:', error);
            throw error;
        }
    }

    /**
     * Benchmark bulk entity creation
     */
    async benchmarkBulkEntityCreation(count) {
        console.log(`\n📝 Testing bulk entity creation (${count} entities)...`);
        
        const entities = [];
        const batchSize = 1000;
        const startTime = performance.now();
        
        // Generate test entities
        for (let i = 0; i < count; i++) {
            entities.push({
                type: ['person', 'concept', 'event', 'task'][Math.floor(Math.random() * 4)],
                name: `Test Entity ${i}`,
                description: `This is a test entity for performance benchmarking. Index: ${i}`,
                importance_score: Math.random(),
                metadata: {
                    test: true,
                    index: i,
                    category: `category_${Math.floor(i / 100)}`
                }
            });
        }
        
        // Insert in batches
        const batchStart = performance.now();
        for (let i = 0; i < entities.length; i += batchSize) {
            const batch = entities.slice(i, i + batchSize);
            await this.insertEntityBatch(batch);
            
            if ((i + batchSize) % 5000 === 0) {
                console.log(`  Progress: ${i + batchSize}/${count} entities`);
            }
        }
        
        const totalTime = performance.now() - startTime;
        const batchTime = performance.now() - batchStart;
        
        this.results.entityOperations = {
            totalEntities: count,
            totalTime: totalTime.toFixed(2),
            batchInsertTime: batchTime.toFixed(2),
            entitiesPerSecond: (count / (totalTime / 1000)).toFixed(2),
            avgTimePerEntity: (totalTime / count).toFixed(4)
        };
        
        console.log(`✅ Created ${count} entities in ${totalTime.toFixed(2)}ms`);
        console.log(`  Rate: ${this.results.entityOperations.entitiesPerSecond} entities/second`);
    }

    /**
     * Insert batch of entities using transaction
     */
    async insertEntityBatch(entities) {
        const db = this.repos.entities.db;
        const transaction = db.transaction((entities) => {
            for (const entity of entities) {
                this.repos.entities.create(entity);
            }
        });
        
        transaction(entities);
    }

    /**
     * Benchmark relation creation
     */
    async benchmarkBulkRelationCreation(count) {
        console.log(`\n🔗 Testing bulk relation creation (${count} relations)...`);
        
        // Get all entity IDs
        const entities = await this.repos.entities.findAll(10000, 0);
        if (entities.length < 2) {
            console.log('⚠️  Not enough entities for relation testing');
            return;
        }
        
        const entityIds = entities.map(e => e.id);
        const relations = [];
        const startTime = performance.now();
        
        // Generate random relations
        for (let i = 0; i < count; i++) {
            const sourceId = entityIds[Math.floor(Math.random() * entityIds.length)];
            let targetId = entityIds[Math.floor(Math.random() * entityIds.length)];
            
            // Ensure different source and target
            while (targetId === sourceId) {
                targetId = entityIds[Math.floor(Math.random() * entityIds.length)];
            }
            
            relations.push({
                source_id: sourceId,
                target_id: targetId,
                type: ['relates_to', 'causes', 'supports', 'part_of'][Math.floor(Math.random() * 4)],
                strength: Math.random()
            });
        }
        
        // Insert relations in transaction
        const db = this.repos.relations.db;
        const transaction = db.transaction((relations) => {
            for (const relation of relations) {
                try {
                    this.repos.relations.create(
                        relation.source_id,
                        relation.target_id,
                        relation.type,
                        relation.strength
                    );
                } catch (error) {
                    // Skip duplicate relations
                    if (!error.message.includes('UNIQUE constraint')) {
                        throw error;
                    }
                }
            }
        });
        
        transaction(relations);
        
        const totalTime = performance.now() - startTime;
        
        this.results.relationOperations = {
            totalRelations: count,
            totalTime: totalTime.toFixed(2),
            relationsPerSecond: (count / (totalTime / 1000)).toFixed(2),
            avgTimePerRelation: (totalTime / count).toFixed(4)
        };
        
        console.log(`✅ Created ${count} relations in ${totalTime.toFixed(2)}ms`);
        console.log(`  Rate: ${this.results.relationOperations.relationsPerSecond} relations/second`);
    }

    /**
     * Benchmark search operations
     */
    async benchmarkSearchOperations(iterations) {
        console.log(`\n🔍 Testing search performance (${iterations} searches)...`);
        
        const searchTerms = [
            'test', 'entity', 'concept', 'person', 'event', 'task',
            'performance', 'benchmark', 'category', 'index'
        ];
        
        const searchResults = {
            traditional: { times: [], results: [] },
            byType: { times: [], results: [] },
            byImportance: { times: [], results: [] },
            paginated: { times: [], results: [] }
        };
        
        // Traditional search
        console.log('  Testing traditional search...');
        for (let i = 0; i < iterations; i++) {
            const term = searchTerms[i % searchTerms.length];
            const start = performance.now();
            const results = await this.repos.entities.search(term, { limit: 100 });
            const time = performance.now() - start;
            searchResults.traditional.times.push(time);
            searchResults.traditional.results.push(results.length);
        }
        
        // Search by type
        console.log('  Testing type-based search...');
        const types = ['person', 'concept', 'event', 'task'];
        for (let i = 0; i < iterations; i++) {
            const type = types[i % types.length];
            const start = performance.now();
            const results = await this.repos.entities.findByType(type, { limit: 100 });
            const time = performance.now() - start;
            searchResults.byType.times.push(time);
            searchResults.byType.results.push(results.length);
        }
        
        // Search by importance
        console.log('  Testing importance-based search...');
        for (let i = 0; i < iterations; i++) {
            const threshold = 0.5 + (Math.random() * 0.4); // 0.5 to 0.9
            const start = performance.now();
            const results = await this.repos.entities.findImportant(threshold, 100);
            const time = performance.now() - start;
            searchResults.byImportance.times.push(time);
            searchResults.byImportance.results.push(results.length);
        }
        
        // Paginated search
        console.log('  Testing paginated search...');
        for (let i = 0; i < iterations; i++) {
            const page = Math.floor(i / 10) + 1;
            const start = performance.now();
            const results = await this.repos.entities.findAll(50, (page - 1) * 50);
            const time = performance.now() - start;
            searchResults.paginated.times.push(time);
            searchResults.paginated.results.push(results.length);
        }
        
        // Calculate statistics
        this.results.searchOperations = {
            iterations,
            traditional: this.calculateStats(searchResults.traditional),
            byType: this.calculateStats(searchResults.byType),
            byImportance: this.calculateStats(searchResults.byImportance),
            paginated: this.calculateStats(searchResults.paginated)
        };
        
        console.log('✅ Search benchmark complete');
    }

    /**
     * Benchmark concurrent operations
     */
    async benchmarkConcurrentOperations(userCount) {
        console.log(`\n👥 Testing concurrent operations (${userCount} users)...`);
        
        const operations = ['read', 'write', 'search', 'update'];
        const startTime = performance.now();
        
        // Simulate concurrent users
        const userPromises = [];
        for (let i = 0; i < userCount; i++) {
            userPromises.push(this.simulateUser(i, operations));
        }
        
        const results = await Promise.all(userPromises);
        const totalTime = performance.now() - startTime;
        
        // Aggregate results
        const aggregated = {
            totalOperations: 0,
            successfulOperations: 0,
            failedOperations: 0,
            operationTimes: []
        };
        
        results.forEach(userResult => {
            aggregated.totalOperations += userResult.operations;
            aggregated.successfulOperations += userResult.successful;
            aggregated.failedOperations += userResult.failed;
            aggregated.operationTimes.push(...userResult.times);
        });
        
        this.results.concurrentOperations = {
            userCount,
            totalTime: totalTime.toFixed(2),
            totalOperations: aggregated.totalOperations,
            successRate: ((aggregated.successfulOperations / aggregated.totalOperations) * 100).toFixed(2),
            operationsPerSecond: (aggregated.totalOperations / (totalTime / 1000)).toFixed(2),
            avgOperationTime: (aggregated.operationTimes.reduce((a, b) => a + b, 0) / aggregated.operationTimes.length).toFixed(2)
        };
        
        console.log(`✅ Concurrent operations complete: ${aggregated.totalOperations} operations in ${totalTime.toFixed(2)}ms`);
    }

    /**
     * Simulate a single user performing operations
     */
    async simulateUser(userId, operations) {
        const results = {
            operations: 0,
            successful: 0,
            failed: 0,
            times: []
        };
        
        // Each user performs 10-20 operations
        const operationCount = 10 + Math.floor(Math.random() * 10);
        
        for (let i = 0; i < operationCount; i++) {
            const operation = operations[Math.floor(Math.random() * operations.length)];
            const start = performance.now();
            
            try {
                switch (operation) {
                    case 'read':
                        await this.repos.entities.findAll(10, 0);
                        break;
                    case 'write':
                        await this.repos.entities.create({
                            type: 'task',
                            name: `Concurrent Test ${userId}-${i}`,
                            description: 'Created during concurrent testing'
                        });
                        break;
                    case 'search':
                        await this.repos.entities.search('test', { limit: 10 });
                        break;
                    case 'update':
                        const entities = await this.repos.entities.findAll(1, 0);
                        if (entities.length > 0) {
                            await this.repos.entities.update(entities[0].id, {
                                description: `Updated by user ${userId} at ${Date.now()}`
                            });
                        }
                        break;
                }
                results.successful++;
            } catch (error) {
                results.failed++;
            }
            
            const time = performance.now() - start;
            results.times.push(time);
            results.operations++;
        }
        
        return results;
    }

    /**
     * Benchmark embedding operations
     */
    async benchmarkEmbeddingOperations(count) {
        console.log(`\n🧠 Testing embedding operations (${count} embeddings)...`);
        
        // Generate mock embeddings (1536 dimensions like OpenAI)
        const generateEmbedding = () => {
            const embedding = new Float32Array(1536);
            for (let i = 0; i < 1536; i++) {
                embedding[i] = (Math.random() - 0.5) * 2;
            }
            return Array.from(embedding);
        };
        
        const entities = await this.repos.entities.findAll(count, 0);
        if (entities.length === 0) {
            console.log('⚠️  No entities found for embedding testing');
            return;
        }
        
        const embeddingTimes = [];
        const searchTimes = [];
        
        // Test embedding storage
        console.log('  Testing embedding storage...');
        for (const entity of entities) {
            const embedding = generateEmbedding();
            const start = performance.now();
            
            await this.repos.entities.update(entity.id, {
                embedding
            });
            
            const time = performance.now() - start;
            embeddingTimes.push(time);
        }
        
        // Test similarity search (mock)
        console.log('  Testing similarity search...');
        const queryEmbedding = generateEmbedding();
        
        for (let i = 0; i < 10; i++) {
            const start = performance.now();
            
            // Simulate vector similarity search
            const entitiesWithEmbeddings = await this.repos.entities.db.prepare(`
                SELECT id, name, embedding 
                FROM entities 
                WHERE embedding IS NOT NULL 
                LIMIT 100
            `).all();
            
            // Calculate similarities (normally done in DB with vector extension)
            const similarities = entitiesWithEmbeddings.map(entity => {
                const embedding = JSON.parse(entity.embedding);
                const similarity = this.cosineSimilarity(queryEmbedding, embedding);
                return { ...entity, similarity };
            });
            
            // Sort by similarity
            similarities.sort((a, b) => b.similarity - a.similarity);
            
            const time = performance.now() - start;
            searchTimes.push(time);
        }
        
        this.results.embeddingOperations = {
            totalEmbeddings: count,
            storageStats: this.calculateStats({ times: embeddingTimes, results: [] }),
            searchStats: this.calculateStats({ times: searchTimes, results: [] }),
            embeddingSize: '1536 dimensions',
            storageFormat: 'JSON array'
        };
        
        console.log('✅ Embedding operations complete');
    }

    /**
     * Calculate cosine similarity between two vectors
     */
    cosineSimilarity(a, b) {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * Calculate statistics for operation times
     */
    calculateStats(data) {
        const times = data.times;
        const sorted = [...times].sort((a, b) => a - b);
        
        return {
            count: times.length,
            avgTime: (times.reduce((a, b) => a + b, 0) / times.length).toFixed(2),
            minTime: sorted[0]?.toFixed(2) || '0',
            maxTime: sorted[sorted.length - 1]?.toFixed(2) || '0',
            p50: sorted[Math.floor(sorted.length * 0.5)]?.toFixed(2) || '0',
            p95: sorted[Math.floor(sorted.length * 0.95)]?.toFixed(2) || '0',
            p99: sorted[Math.floor(sorted.length * 0.99)]?.toFixed(2) || '0',
            avgResults: data.results.length > 0 
                ? (data.results.reduce((a, b) => a + b, 0) / data.results.length).toFixed(2)
                : 'N/A'
        };
    }

    /**
     * Generate performance report
     */
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                entityOperations: this.results.entityOperations,
                relationOperations: this.results.relationOperations,
                searchPerformance: {
                    traditional: `${this.results.searchOperations.traditional.avgTime}ms avg`,
                    byType: `${this.results.searchOperations.byType.avgTime}ms avg`,
                    byImportance: `${this.results.searchOperations.byImportance.avgTime}ms avg`,
                    paginated: `${this.results.searchOperations.paginated.avgTime}ms avg`
                },
                concurrentPerformance: {
                    users: this.results.concurrentOperations.userCount,
                    operationsPerSecond: this.results.concurrentOperations.operationsPerSecond,
                    successRate: `${this.results.concurrentOperations.successRate}%`
                },
                embeddingPerformance: {
                    storageTime: `${this.results.embeddingOperations?.storageStats?.avgTime || 'N/A'}ms avg`,
                    searchTime: `${this.results.embeddingOperations?.searchStats?.avgTime || 'N/A'}ms avg`
                }
            },
            detailed: this.results,
            recommendations: this.generateRecommendations()
        };
        
        return report;
    }

    /**
     * Generate performance recommendations
     */
    generateRecommendations() {
        const recommendations = [];
        
        // Entity operation recommendations
        if (this.results.entityOperations.entitiesPerSecond < 1000) {
            recommendations.push({
                area: 'Entity Operations',
                issue: 'Low entity creation throughput',
                suggestion: 'Consider using prepared statements and batch transactions'
            });
        }
        
        // Search performance recommendations
        const searchTypes = ['traditional', 'byType', 'byImportance', 'paginated'];
        searchTypes.forEach(type => {
            const stats = this.results.searchOperations[type];
            if (stats && parseFloat(stats.avgTime) > 50) {
                recommendations.push({
                    area: 'Search Performance',
                    issue: `Slow ${type} search (${stats.avgTime}ms average)`,
                    suggestion: 'Review indexes and consider query optimization'
                });
            }
        });
        
        // Concurrent operation recommendations
        if (this.results.concurrentOperations.successRate < 95) {
            recommendations.push({
                area: 'Concurrent Operations',
                issue: `Low success rate (${this.results.concurrentOperations.successRate}%)`,
                suggestion: 'Implement better transaction handling and retry logic'
            });
        }
        
        // Embedding recommendations
        if (this.results.embeddingOperations?.searchStats?.avgTime > 100) {
            recommendations.push({
                area: 'Embedding Search',
                issue: 'Slow vector similarity search',
                suggestion: 'Consider using a dedicated vector database or SQLite vector extension'
            });
        }
        
        return recommendations;
    }
}

module.exports = PerformanceBenchmark;