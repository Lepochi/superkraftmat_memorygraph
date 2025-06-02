const { EventEmitter } = require('events');
const os = require('os');
const v8 = require('v8');

/**
 * Analytics Service for Memory System Performance Monitoring
 * 
 * Collects real-time metrics for:
 * - System performance (CPU, memory, event loop)
 * - Backend performance (query times, API response times)
 * - Semantic search analytics (embedding operations, search patterns)
 * - Memory usage patterns (entity/relation growth, access patterns)
 */
class AnalyticsService extends EventEmitter {
    constructor() {
        super();
        
        // Metrics storage
        this.metrics = {
            system: {},
            backend: {},
            semantic: {},
            memory: {},
            realtime: []
        };
        
        // Performance tracking
        this.queryTimes = [];
        this.embeddingTimes = [];
        this.searchPatterns = new Map();
        this.entityAccessPatterns = new Map();
        
        // Real-time metrics collection
        this.startRealTimeCollection();
        
        console.log('📊 Analytics Service initialized');
    }

    /**
     * Start real-time metrics collection
     */
    startRealTimeCollection() {
        // Collect system metrics every 5 seconds
        setInterval(() => {
            this.collectSystemMetrics();
        }, 5000);
        
        // Collect event loop lag every second
        setInterval(() => {
            this.measureEventLoopLag();
        }, 1000);
        
        // Clean old metrics every minute (keep last 100 entries)
        setInterval(() => {
            this.cleanOldMetrics();
        }, 60000);
    }

    /**
     * Collect system performance metrics
     */
    collectSystemMetrics() {
        const timestamp = Date.now();
        
        // CPU Usage
        const cpuUsage = process.cpuUsage();
        
        // Memory usage
        const memoryUsage = process.memoryUsage();
        const systemMemory = {
            total: os.totalmem(),
            free: os.freemem(),
            used: os.totalmem() - os.freemem()
        };
        
        // V8 Heap Statistics
        const heapStats = v8.getHeapStatistics();
        
        const systemMetrics = {
            timestamp,
            cpu: {
                user: cpuUsage.user / 1000000, // Convert to milliseconds
                system: cpuUsage.system / 1000000,
                loadAverage: os.loadavg()
            },
            memory: {
                process: {
                    rss: memoryUsage.rss,
                    heapTotal: memoryUsage.heapTotal,
                    heapUsed: memoryUsage.heapUsed,
                    external: memoryUsage.external,
                    arrayBuffers: memoryUsage.arrayBuffers
                },
                system: systemMemory,
                heap: {
                    totalHeapSize: heapStats.total_heap_size,
                    totalHeapSizeExecutable: heapStats.total_heap_size_executable,
                    usedHeapSize: heapStats.used_heap_size,
                    heapSizeLimit: heapStats.heap_size_limit
                }
            },
            uptime: process.uptime()
        };
        
        this.metrics.system = systemMetrics;
        this.metrics.realtime.push({
            type: 'system',
            data: systemMetrics
        });
        
        // Emit real-time event
        this.emit('metrics:system', systemMetrics);
    }

    /**
     * Measure event loop lag
     */
    measureEventLoopLag() {
        const start = process.hrtime.bigint();
        
        setImmediate(() => {
            const end = process.hrtime.bigint();
            const lag = Number(end - start) / 1000000; // Convert to milliseconds
            
            const lagMetrics = {
                timestamp: Date.now(),
                eventLoopLag: lag
            };
            
            this.metrics.realtime.push({
                type: 'eventLoop',
                data: lagMetrics
            });
            
            this.emit('metrics:eventLoop', lagMetrics);
        });
    }

    /**
     * Track API query performance
     */
    trackQuery(operation, duration, metadata = {}) {
        const queryMetric = {
            timestamp: Date.now(),
            operation,
            duration,
            metadata
        };
        
        this.queryTimes.push(queryMetric);
        
        // Update backend metrics
        if (!this.metrics.backend[operation]) {
            this.metrics.backend[operation] = {
                count: 0,
                totalTime: 0,
                avgTime: 0,
                minTime: Infinity,
                maxTime: 0
            };
        }
        
        const opMetrics = this.metrics.backend[operation];
        opMetrics.count++;
        opMetrics.totalTime += duration;
        opMetrics.avgTime = opMetrics.totalTime / opMetrics.count;
        opMetrics.minTime = Math.min(opMetrics.minTime, duration);
        opMetrics.maxTime = Math.max(opMetrics.maxTime, duration);
        
        this.emit('metrics:query', queryMetric);
        
        // Keep only last 1000 query times
        if (this.queryTimes.length > 1000) {
            this.queryTimes = this.queryTimes.slice(-1000);
        }
    }

    /**
     * Track semantic search operations
     */
    trackSemanticSearch(searchType, query, results, duration, metadata = {}) {
        const semanticMetric = {
            timestamp: Date.now(),
            searchType, // 'semantic', 'hybrid', 'traditional', 'fuzzy'
            query: query.substring(0, 100), // Truncate for privacy
            resultCount: results.length,
            duration,
            metadata
        };
        
        // Update search patterns
        const pattern = searchType;
        this.searchPatterns.set(pattern, (this.searchPatterns.get(pattern) || 0) + 1);
        
        // Update semantic metrics
        if (!this.metrics.semantic[searchType]) {
            this.metrics.semantic[searchType] = {
                count: 0,
                totalTime: 0,
                avgTime: 0,
                avgResults: 0,
                totalResults: 0
            };
        }
        
        const searchMetrics = this.metrics.semantic[searchType];
        searchMetrics.count++;
        searchMetrics.totalTime += duration;
        searchMetrics.avgTime = searchMetrics.totalTime / searchMetrics.count;
        searchMetrics.totalResults += results.length;
        searchMetrics.avgResults = searchMetrics.totalResults / searchMetrics.count;
        
        this.emit('metrics:semantic', semanticMetric);
    }

    /**
     * Track embedding operations
     */
    trackEmbedding(operation, textLength, duration, success = true) {
        const embeddingMetric = {
            timestamp: Date.now(),
            operation, // 'generate', 'store', 'retrieve'
            textLength,
            duration,
            success
        };
        
        this.embeddingTimes.push(embeddingMetric);
        
        // Update embedding metrics
        if (!this.metrics.semantic.embeddings) {
            this.metrics.semantic.embeddings = {
                operations: 0,
                totalTime: 0,
                avgTime: 0,
                successRate: 0,
                failures: 0
            };
        }
        
        const embMetrics = this.metrics.semantic.embeddings;
        embMetrics.operations++;
        embMetrics.totalTime += duration;
        embMetrics.avgTime = embMetrics.totalTime / embMetrics.operations;
        
        if (!success) embMetrics.failures++;
        embMetrics.successRate = ((embMetrics.operations - embMetrics.failures) / embMetrics.operations) * 100;
        
        this.emit('metrics:embedding', embeddingMetric);
        
        // Keep only last 500 embedding times
        if (this.embeddingTimes.length > 500) {
            this.embeddingTimes = this.embeddingTimes.slice(-500);
        }
    }

    /**
     * Track entity access patterns
     */
    trackEntityAccess(entityId, operation) {
        const accessKey = `${entityId}:${operation}`;
        this.entityAccessPatterns.set(accessKey, (this.entityAccessPatterns.get(accessKey) || 0) + 1);
        
        this.emit('metrics:entityAccess', {
            timestamp: Date.now(),
            entityId,
            operation,
            count: this.entityAccessPatterns.get(accessKey)
        });
    }

    /**
     * Track memory growth patterns
     */
    trackMemoryGrowth(entityCount, relationCount, observationCount) {
        const memoryMetric = {
            timestamp: Date.now(),
            entities: entityCount,
            relations: relationCount,
            observations: observationCount,
            total: entityCount + relationCount + observationCount
        };
        
        this.metrics.memory.growth = memoryMetric;
        this.emit('metrics:memoryGrowth', memoryMetric);
    }

    /**
     * Get comprehensive analytics summary
     */
    getAnalyticsSummary() {
        return {
            timestamp: Date.now(),
            system: this.metrics.system,
            backend: this.metrics.backend,
            semantic: this.metrics.semantic,
            memory: this.metrics.memory,
            patterns: {
                searchPatterns: Object.fromEntries(this.searchPatterns),
                topEntities: this.getTopAccessedEntities(10)
            },
            performance: {
                recentQueries: this.queryTimes.slice(-10),
                recentEmbeddings: this.embeddingTimes.slice(-5),
                avgQueryTime: this.getAverageQueryTime(),
                avgEmbeddingTime: this.getAverageEmbeddingTime()
            }
        };
    }

    /**
     * Get real-time metrics for dashboard
     */
    getRealTimeMetrics(limit = 50) {
        return this.metrics.realtime.slice(-limit);
    }

    /**
     * Get performance trends over time
     */
    getPerformanceTrends(timeRange = 3600000) { // Default 1 hour
        const cutoff = Date.now() - timeRange;
        
        return {
            queries: this.queryTimes.filter(q => q.timestamp > cutoff),
            embeddings: this.embeddingTimes.filter(e => e.timestamp > cutoff),
            realtime: this.metrics.realtime.filter(r => r.data.timestamp > cutoff)
        };
    }

    /**
     * Helper methods
     */
    getAverageQueryTime() {
        if (this.queryTimes.length === 0) return 0;
        const total = this.queryTimes.reduce((sum, q) => sum + q.duration, 0);
        return total / this.queryTimes.length;
    }

    getAverageEmbeddingTime() {
        if (this.embeddingTimes.length === 0) return 0;
        const total = this.embeddingTimes.reduce((sum, e) => sum + e.duration, 0);
        return total / this.embeddingTimes.length;
    }

    getTopAccessedEntities(limit = 10) {
        const entityCounts = new Map();
        
        for (const [key, count] of this.entityAccessPatterns) {
            const [entityId] = key.split(':');
            entityCounts.set(entityId, (entityCounts.get(entityId) || 0) + count);
        }
        
        return Array.from(entityCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([entityId, count]) => ({ entityId, count }));
    }

    cleanOldMetrics() {
        // Keep only last 100 real-time metrics
        if (this.metrics.realtime.length > 100) {
            this.metrics.realtime = this.metrics.realtime.slice(-100);
        }
        
        // Clean old entity access patterns (keep only last 24 hours of data)
        const cutoff = Date.now() - (24 * 60 * 60 * 1000);
        // Note: This is simplified - in production you'd want timestamp-based cleanup
    }
}

// Singleton instance
let analyticsInstance = null;

function getAnalyticsService() {
    if (!analyticsInstance) {
        analyticsInstance = new AnalyticsService();
    }
    return analyticsInstance;
}

module.exports = {
    AnalyticsService,
    getAnalyticsService
};