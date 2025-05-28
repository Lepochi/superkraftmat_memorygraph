/**
 * Quick Framework Test
 * Test the framework components directly
 */

// Test framework configuration
console.log('🧪 Testing Framework Configuration...');

try {
    const config = require('./backend/src/framework/config.js');
    console.log('✅ Framework config loaded successfully');
    
    // Test config structure
    if (config.MEMORY_FRAMEWORK && config.INTELLIGENCE_FEATURES && config.OPTIMIZATION_SETTINGS) {
        console.log('✅ All main configuration sections present');
        
        // Test tier configuration
        const tiers = Object.keys(config.MEMORY_FRAMEWORK);
        console.log(`✅ Found ${tiers.length} tiers: ${tiers.join(', ')}`);
        
        // Test optimization settings
        const maxTokens = config.OPTIMIZATION_SETTINGS.CONTEXT_WINDOW.maxTokens;
        console.log(`✅ Context window limit: ${maxTokens} tokens`);
        
    } else {
        console.log('❌ Missing configuration sections');
    }
} catch (error) {
    console.log('❌ Framework config error:', error.message);
}

// Test framework engine
console.log('\n🧪 Testing Framework Engine...');

try {
    const MemoryFrameworkEngine = require('./backend/src/framework/engine.js');
    console.log('✅ Framework engine loaded successfully');
    
    // Test engine instantiation
    const engine = new MemoryFrameworkEngine('./memory/data/memory.jsonl');
    console.log('✅ Engine instance created');
    
    // Test analysis method
    const testInput = 'I want to start a new project';
    engine.analyzeInput(testInput, {}).then(analysis => {
        console.log('✅ Analysis method working');
        console.log(`   - Input: "${testInput}"`);
        console.log(`   - Triggers: ${analysis.triggers.join(', ') || 'None'}`);
        console.log(`   - Confidence: ${Math.round(analysis.confidence * 100)}%`);
        console.log(`   - Intent: ${analysis.intent}`);
    }).catch(error => {
        console.log('❌ Analysis method error:', error.message);
    });
    
} catch (error) {
    console.log('❌ Framework engine error:', error.message);
}

// Test memory file access
console.log('\n🧪 Testing Memory File Access...');

const fs = require('fs');
const path = require('path');

const memoryPath = path.join(__dirname, 'memory/data/memory.jsonl');

try {
    if (fs.existsSync(memoryPath)) {
        const data = fs.readFileSync(memoryPath, 'utf8');
        const lines = data.trim().split('\n').filter(line => line.trim());
        
        console.log('✅ Memory file accessible');
        console.log(`✅ Found ${lines.length} memory entries`);
        
        // Count entities and relations
        let entities = 0;
        let relations = 0;
        
        lines.forEach(line => {
            const entry = JSON.parse(line);
            if (entry.type === 'entity') entities++;
            if (entry.type === 'relation') relations++;
        });
        
        console.log(`✅ Entities: ${entities}, Relations: ${relations}`);
        
    } else {
        console.log('❌ Memory file not found at:', memoryPath);
    }
} catch (error) {
    console.log('❌ Memory file access error:', error.message);
}

console.log('\n🎯 Framework Test Complete!');
