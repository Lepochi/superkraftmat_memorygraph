const express = require('express');
const { getAnalyticsService } = require('../../services/analyticsService');
const asyncHandler = require('../../middleware/asyncHandler');

const router = express.Router();

/**
 * Analytics API Routes
 * 
 * Provides real-time performance monitoring and analytics data
 * for the memory system dashboard
 */

/**
 * GET /api/v2/analytics/summary
 * Get comprehensive analytics summary
 */
router.get('/summary', asyncHandler(async (req, res) => {
    const analytics = getAnalyticsService();
    const summary = analytics.getAnalyticsSummary();
    
    res.json({
        success: true,
        data: summary,
        timestamp: Date.now()
    });
}));

/**
 * GET /api/v2/analytics/realtime
 * Get real-time metrics for live dashboard
 */
router.get('/realtime', asyncHandler(async (req, res) => {
    const analytics = getAnalyticsService();
    const limit = parseInt(req.query.limit) || 50;
    const metrics = analytics.getRealTimeMetrics(limit);
    
    res.json({
        success: true,
        data: metrics,
        timestamp: Date.now()
    });
}));

/**
 * GET /api/v2/analytics/performance
 * Get performance trends over time
 */
router.get('/performance', asyncHandler(async (req, res) => {
    const analytics = getAnalyticsService();
    const timeRange = parseInt(req.query.timeRange) || 3600000; // 1 hour default
    const trends = analytics.getPerformanceTrends(timeRange);
    
    res.json({
        success: true,
        data: trends,
        timeRange,
        timestamp: Date.now()
    });
}));

/**
 * GET /api/v2/analytics/system
 * Get current system metrics
 */
router.get('/system', asyncHandler(async (req, res) => {
    const analytics = getAnalyticsService();
    const summary = analytics.getAnalyticsSummary();
    
    res.json({
        success: true,
        data: {
            system: summary.system,
            uptime: process.uptime(),
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch
        },
        timestamp: Date.now()
    });
}));

/**
 * GET /api/v2/analytics/semantic
 * Get semantic search analytics
 */
router.get('/semantic', asyncHandler(async (req, res) => {
    const analytics = getAnalyticsService();
    const summary = analytics.getAnalyticsSummary();
    
    res.json({
        success: true,
        data: {
            semantic: summary.semantic,
            searchPatterns: summary.patterns.searchPatterns,
            recentEmbeddings: summary.performance.recentEmbeddings
        },
        timestamp: Date.now()
    });
}));

/**
 * GET /api/v2/analytics/backend
 * Get backend performance metrics
 */
router.get('/backend', asyncHandler(async (req, res) => {
    const analytics = getAnalyticsService();
    const summary = analytics.getAnalyticsSummary();
    
    res.json({
        success: true,
        data: {
            backend: summary.backend,
            recentQueries: summary.performance.recentQueries,
            avgQueryTime: summary.performance.avgQueryTime
        },
        timestamp: Date.now()
    });
}));

/**
 * GET /api/v2/analytics/memory
 * Get memory usage and growth patterns
 */
router.get('/memory', asyncHandler(async (req, res) => {
    const analytics = getAnalyticsService();
    const summary = analytics.getAnalyticsSummary();
    
    res.json({
        success: true,
        data: {
            memory: summary.memory,
            topEntities: summary.patterns.topEntities,
            growth: summary.memory.growth
        },
        timestamp: Date.now()
    });
}));

/**
 * GET /api/v2/analytics/health
 * Get system health status
 */
router.get('/health', asyncHandler(async (req, res) => {
    const analytics = getAnalyticsService();
    const summary = analytics.getAnalyticsSummary();
    
    // Determine health status based on metrics
    const systemMetrics = summary.system;
    const performance = summary.performance;
    
    let healthStatus = 'healthy';
    const issues = [];
    
    // Check memory usage (warn if > 80%, critical if > 90%)
    if (systemMetrics.memory && systemMetrics.memory.process) {
        const memoryUsagePercent = (systemMetrics.memory.process.heapUsed / systemMetrics.memory.process.heapTotal) * 100;
        if (memoryUsagePercent > 90) {
            healthStatus = 'critical';
            issues.push('High memory usage');
        } else if (memoryUsagePercent > 80) {
            healthStatus = 'warning';
            issues.push('Elevated memory usage');
        }
    }
    
    // Check average query time (warn if > 100ms, critical if > 500ms)
    if (performance.avgQueryTime > 500) {
        healthStatus = 'critical';
        issues.push('Slow query performance');
    } else if (performance.avgQueryTime > 100) {
        if (healthStatus !== 'critical') healthStatus = 'warning';
        issues.push('Elevated query times');
    }
    
    // Check embedding success rate
    if (summary.semantic.embeddings && summary.semantic.embeddings.successRate < 95) {
        if (healthStatus !== 'critical') healthStatus = 'warning';
        issues.push('Embedding operation failures');
    }
    
    res.json({
        success: true,
        data: {
            status: healthStatus,
            issues,
            uptime: process.uptime(),
            timestamp: Date.now(),
            summary: {
                queries: Object.keys(summary.backend).length,
                searchTypes: Object.keys(summary.semantic).length,
                memoryUsage: systemMetrics.memory?.process?.heapUsed || 0,
                avgQueryTime: performance.avgQueryTime
            }
        }
    });
}));

module.exports = router;