#!/usr/bin/env node

/**
 * Performance Benchmark Runner for Superkraft Memory System
 * 
 * Tests system performance with configurable parameters
 */

const path = require('path');
const fs = require('fs');

// Set environment variables
process.env.USE_SQLITE = 'true';
process.env.NODE_ENV = 'test';
process.env.SQLITE_PATH = path.join(__dirname, '../memory/database/benchmark.db');

const DatabaseManager = require('../backend/src/database/DatabaseManager');
const RepositoryManager = require('../backend/src/repositories/RepositoryManager');
const PerformanceBenchmark = require('../backend/src/utils/performanceBenchmark');

async function runBenchmark() {
    console.log('🚀 Superkraft Memory System - Performance Benchmark');
    console.log('=' .repeat(60));
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    const options = {
        entityCount: 10000,
        relationCount: 20000,
        searchIterations: 100,
        concurrentUsers: 50,
        clean: true
    };
    
    // Parse arguments
    args.forEach(arg => {
        const [key, value] = arg.split('=');
        switch (key) {
            case '--entities':
                options.entityCount = parseInt(value);
                break;
            case '--relations':
                options.relationCount = parseInt(value);
                break;
            case '--searches':
                options.searchIterations = parseInt(value);
                break;
            case '--users':
                options.concurrentUsers = parseInt(value);
                break;
            case '--no-clean':
                options.clean = false;
                break;
        }
    });
    
    try {
        // Create benchmark database
        if (options.clean && fs.existsSync(process.env.SQLITE_PATH)) {
            console.log('🗑️  Cleaning up previous benchmark database...');
            fs.unlinkSync(process.env.SQLITE_PATH);
        }
        
        // Initialize database
        console.log('📊 Initializing benchmark database...');
        
        // Initialize repositories with database path
        const repos = new RepositoryManager(process.env.SQLITE_PATH);
        
        // Create benchmark instance
        const benchmark = new PerformanceBenchmark(repos);
        
        // Run benchmark
        const report = await benchmark.runFullBenchmark(options);
        
        // Save report
        const reportPath = path.join(__dirname, '../memory/benchmarks', `benchmark-${Date.now()}.json`);
        
        // Ensure directory exists
        const benchmarkDir = path.dirname(reportPath);
        if (!fs.existsSync(benchmarkDir)) {
            fs.mkdirSync(benchmarkDir, { recursive: true });
        }
        
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        // Print summary
        console.log('\n📈 BENCHMARK RESULTS SUMMARY');
        console.log('=' .repeat(60));
        
        console.log('\n🔹 Entity Operations:');
        console.log(`  • Created: ${report.summary.entityOperations.totalEntities} entities`);
        console.log(`  • Time: ${report.summary.entityOperations.totalTime}ms`);
        console.log(`  • Throughput: ${report.summary.entityOperations.entitiesPerSecond} entities/sec`);
        
        console.log('\n🔹 Relation Operations:');
        console.log(`  • Created: ${report.summary.relationOperations.totalRelations} relations`);
        console.log(`  • Time: ${report.summary.relationOperations.totalTime}ms`);
        console.log(`  • Throughput: ${report.summary.relationOperations.relationsPerSecond} relations/sec`);
        
        console.log('\n🔹 Search Performance:');
        Object.entries(report.summary.searchPerformance).forEach(([type, time]) => {
            console.log(`  • ${type}: ${time}`);
        });
        
        console.log('\n🔹 Concurrent Operations:');
        console.log(`  • Users: ${report.summary.concurrentPerformance.users}`);
        console.log(`  • Throughput: ${report.summary.concurrentPerformance.operationsPerSecond} ops/sec`);
        console.log(`  • Success Rate: ${report.summary.concurrentPerformance.successRate}`);
        
        console.log('\n🔹 Embedding Performance:');
        console.log(`  • Storage: ${report.summary.embeddingPerformance.storageTime}`);
        console.log(`  • Search: ${report.summary.embeddingPerformance.searchTime}`);
        
        // Print recommendations
        if (report.recommendations.length > 0) {
            console.log('\n💡 RECOMMENDATIONS');
            console.log('=' .repeat(60));
            report.recommendations.forEach((rec, index) => {
                console.log(`\n${index + 1}. ${rec.area}`);
                console.log(`   Issue: ${rec.issue}`);
                console.log(`   Suggestion: ${rec.suggestion}`);
            });
        }
        
        console.log(`\n✅ Full report saved to: ${reportPath}`);
        
        // Cleanup
        repos.close();
        
    } catch (error) {
        console.error('❌ Benchmark failed:', error);
        process.exit(1);
    }
}

// Show help
if (process.argv.includes('--help')) {
    console.log(`
Usage: node run-performance-benchmark.js [options]

Options:
  --entities=N       Number of entities to create (default: 10000)
  --relations=N      Number of relations to create (default: 20000)
  --searches=N       Number of search iterations (default: 100)
  --users=N          Number of concurrent users (default: 50)
  --no-clean         Don't clean up previous benchmark database
  --help             Show this help message

Example:
  node run-performance-benchmark.js --entities=50000 --users=100
`);
    process.exit(0);
}

// Run benchmark
runBenchmark().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});