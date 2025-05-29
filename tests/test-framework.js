#!/usr/bin/env node

/**
 * Framework Test Script
 * Quick test to verify framework system is working
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

class FrameworkTester {
    constructor() {
        this.baseUrl = 'http://localhost:8000';
        this.serverProcess = null;
    }

    async runTests() {
        console.log('🧪 Starting Framework System Tests\n');

        try {
            // Start the server
            await this.startServer();
            
            // Wait for server to be ready
            await this.waitForServer();
            
            // Run tests
            await this.testHealthCheck();
            await this.testAnalyzeEndpoint();
            await this.testContextEndpoint();
            await this.testStatsEndpoint();
            
            console.log('\n✅ All tests passed! Framework system is working correctly.');
            
        } catch (error) {
            console.error('\n❌ Test failed:', error.message);
            process.exit(1);
        } finally {
            // Clean up
            if (this.serverProcess) {
                this.serverProcess.kill();
                console.log('\n🛑 Server stopped');
            }
        }
    }

    async startServer() {
        console.log('🚀 Starting backend server...');
        
        const serverPath = path.join(__dirname, 'backend/src/server.js');
        this.serverProcess = spawn('node', [serverPath], {
            cwd: __dirname,
            stdio: 'pipe'
        });

        this.serverProcess.stdout.on('data', (data) => {
            const output = data.toString();
            if (output.includes('Memory Backend running')) {
                console.log('✅ Backend server started successfully');
            }
        });

        this.serverProcess.stderr.on('data', (data) => {
            console.error('Server error:', data.toString());
        });

        // Give server time to start
        await this.sleep(3000);
    }

    async waitForServer() {
        console.log('⏳ Waiting for server to be ready...');
        
        for (let i = 0; i < 10; i++) {
            try {
                await this.makeRequest('/api/health');
                console.log('✅ Server is ready');
                return;
            } catch (error) {
                await this.sleep(1000);
            }
        }
        
        throw new Error('Server failed to start within timeout');
    }

    async testHealthCheck() {
        console.log('\n🔍 Testing health check endpoint...');
        
        const response = await this.makeRequest('/api/health');
        
        if (response.status === 'healthy') {
            console.log('✅ Health check passed');
        } else {
            throw new Error('Health check failed');
        }
    }

    async testAnalyzeEndpoint() {
        console.log('\n🔍 Testing framework analyze endpoint...');
        
        const testInput = 'I want to start a new Shopify migration project';
        const response = await this.makeRequest(`/api/framework/analyze?input=${encodeURIComponent(testInput)}`);
        
        if (response.success && response.analysis) {
            console.log('✅ Analyze endpoint working');
            console.log(`   - Confidence: ${Math.round(response.analysis.confidence * 100)}%`);
            console.log(`   - Intent: ${response.analysis.intent}`);
            console.log(`   - Triggers: ${response.analysis.triggers.join(', ') || 'None'}`);
            console.log(`   - Recommended tiers: ${response.analysis.recommended_tiers.join(', ')}`);
        } else {
            throw new Error('Analyze endpoint failed');
        }
    }

    async testContextEndpoint() {
        console.log('\n🔍 Testing framework context endpoint...');
        
        const testInput = 'Tell me about our current business status and active projects';
        const response = await this.makeRequest(`/api/framework/context?input=${encodeURIComponent(testInput)}`);
        
        if (response.success && response.context) {
            console.log('✅ Context endpoint working');
            console.log(`   - Framework version: ${response.framework_version}`);
            console.log(`   - Token count: ${response.context.metadata.tokenCount}`);
            console.log(`   - Confidence: ${Math.round(response.context.metadata.confidence * 100)}%`);
            
            // Check tier activation
            const tiers = [];
            if (response.context.tier1 && !response.context.tier1.enabled === false) tiers.push('Tier 1');
            if (response.context.tier2 && !response.context.tier2.enabled === false) tiers.push('Tier 2');
            if (response.context.tier3 && !response.context.tier3.enabled === false) tiers.push('Tier 3');
            
            console.log(`   - Active tiers: ${tiers.join(', ') || 'None'}`);
        } else {
            throw new Error('Context endpoint failed');
        }
    }

    async testStatsEndpoint() {
        console.log('\n🔍 Testing framework stats endpoint...');
        
        const response = await this.makeRequest('/api/framework/stats');
        
        if (response.memory_overview) {
            console.log('✅ Stats endpoint working');
            console.log(`   - Total entities: ${response.memory_overview.total_entities}`);
            console.log(`   - Total relations: ${response.memory_overview.total_relations}`);
            console.log(`   - Entity types: ${response.memory_overview.entity_types}`);
            console.log(`   - Cache size: ${response.cache_stats.size}`);
        } else {
            throw new Error('Stats endpoint failed');
        }
    }

    async makeRequest(path) {
        return new Promise((resolve, reject) => {
            const req = http.get(`${this.baseUrl}${path}`, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        resolve(response);
                    } catch (error) {
                        reject(new Error(`Failed to parse response: ${data}`));
                    }
                });
            });
            
            req.on('error', (error) => {
                reject(error);
            });
            
            req.setTimeout(5000, () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
        });
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new FrameworkTester();
    tester.runTests();
}

module.exports = FrameworkTester;
