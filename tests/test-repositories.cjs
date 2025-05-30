const RepositoryManager = require('../backend/src/repositories/RepositoryManager');
const path = require('path');

// Test database path
const testDbPath = path.join(__dirname, '../memory/database/test-repositories.db');

async function testRepositories() {
    console.log('🧪 Testing Repository Integration...\n');
    
    const repos = new RepositoryManager(testDbPath);
    repos.initialize();
    
    try {
        // Test 1: Entity operations
        console.log('1️⃣ Testing Entity Repository...');
        
        // Create entities
        const person = await repos.entities.create({
            name: 'Test User',
            type: 'person',
            description: 'A test user for repository testing',
            importance_score: 0.8
        });
        console.log('✅ Created person:', person.name);
        
        const company = await repos.entities.create({
            name: 'Test Company',
            type: 'concept',
            description: 'A test company',
            metadata: { originalType: 'company', industry: 'tech' }
        });
        console.log('✅ Created company:', company.name);
        
        // Search entities
        const searchResults = await repos.entities.search('Test', 10);
        console.log(`✅ Search found ${searchResults.length} entities\n`);
        
        // Test 2: Observation operations
        console.log('2️⃣ Testing Observation Repository...');
        
        // Add observations
        const obs1 = await repos.observations.create(person.id, 'First observation about the test user', {
            importance: 0.7
        });
        const obs2 = await repos.observations.addNote(person.id, 'Second note about activities');
        console.log('✅ Added observations to person');
        
        // Get history
        const history = await repos.observations.getHistory(person.id);
        console.log(`✅ Retrieved ${history.length} observations\n`);
        
        // Test 3: Relation operations
        console.log('3️⃣ Testing Relation Repository...');
        
        // Create relation
        const relation = await repos.relations.create(
            person.id,
            company.id,
            'part_of',
            0.9,
            { role: 'developer' }
        );
        console.log('✅ Created relation between person and company');
        
        // Find connected entities
        const connected = await repos.relations.findConnected(person.id);
        console.log(`✅ Found ${connected.length} connected entities\n`);
        
        // Test 4: Complex queries
        console.log('4️⃣ Testing Complex Operations...');
        
        // Get entity with full context
        const fullContext = await repos.getEntityWithContext(person.id);
        console.log('✅ Entity with context:');
        console.log(`   - Relations: ${fullContext.relations.length}`);
        console.log(`   - Observations: ${fullContext.observations.length}`);
        
        // Global search
        const globalResults = await repos.globalSearch('test');
        console.log(`✅ Global search found ${globalResults.length} results\n`);
        
        // Test 5: Business methods
        console.log('5️⃣ Testing Business Methods...');
        
        // Get people
        const people = await repos.entities.getPeople();
        console.log(`✅ Found ${people.length} people`);
        
        // Get companies
        const companies = await repos.entities.getCompanies();
        console.log(`✅ Found ${companies.length} companies`);
        
        // Get recent activity
        const recent = await repos.observations.getRecent(10);
        console.log(`✅ Found ${recent.length} recent observations\n`);
        
        // Test 6: Performance test
        console.log('6️⃣ Testing Performance...');
        const startTime = Date.now();
        
        // Bulk create
        const bulkEntities = [];
        for (let i = 0; i < 100; i++) {
            bulkEntities.push({
                name: `Bulk Entity ${i}`,
                type: 'concept',
                description: `Test entity number ${i}`,
                importance_score: Math.random()
            });
        }
        
        await repos.entities.bulkCreate(bulkEntities);
        const bulkTime = Date.now() - startTime;
        console.log(`✅ Created 100 entities in ${bulkTime}ms (${(bulkTime / 100).toFixed(2)}ms per entity)`);
        
        // Search performance
        const searchStart = Date.now();
        const searchTest = await repos.entities.search('Bulk', 50);
        const searchTime = Date.now() - searchStart;
        console.log(`✅ Search completed in ${searchTime}ms\n`);
        
        // Get stats
        const stats = repos.getStats();
        console.log('📊 Database Statistics:');
        console.log(`   - Entities: ${stats.entities}`);
        console.log(`   - Relations: ${stats.relations}`);
        console.log(`   - Observations: ${stats.observations}`);
        console.log(`   - DB Size: ${(stats.dbSize / 1024).toFixed(2)} KB`);
        
        console.log('\n✅ All repository tests passed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        throw error;
    } finally {
        repos.close();
        
        // Clean up test database
        const fs = require('fs');
        try {
            fs.unlinkSync(testDbPath);
            fs.unlinkSync(testDbPath + '-wal');
            fs.unlinkSync(testDbPath + '-shm');
        } catch (e) {
            // Ignore cleanup errors
        }
    }
}

// Run tests
testRepositories().catch(console.error);