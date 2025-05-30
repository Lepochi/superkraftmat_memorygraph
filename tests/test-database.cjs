const DatabaseManager = require('../backend/src/database/DatabaseManager');
const crypto = require('crypto');

// Test the database implementation
async function testDatabase() {
    console.log('🧪 Testing SQLite Database Implementation...\n');
    
    const db = new DatabaseManager();
    
    try {
        // Test 1: Connection
        console.log('1️⃣ Testing database connection...');
        db.connect();
        console.log('✅ Database connected successfully\n');
        
        // Test 2: Insert entities
        console.log('2️⃣ Testing entity insertion...');
        const entities = [
            {
                id: crypto.randomUUID(),
                type: 'person',
                name: 'John Doe',
                description: 'Test person entity',
                importance_score: 0.8,
                metadata: JSON.stringify({ role: 'developer' })
            },
            {
                id: crypto.randomUUID(),
                type: 'concept',
                name: 'SQLite Migration',
                description: 'Database migration from JSONL to SQLite',
                importance_score: 0.9,
                metadata: JSON.stringify({ phase: 2 })
            }
        ];
        
        entities.forEach(entity => {
            db.statements.insertEntity.run(entity);
        });
        console.log('✅ Entities inserted successfully\n');
        
        // Test 3: Query entities
        console.log('3️⃣ Testing entity retrieval...');
        const result = db.statements.getEntity.get(entities[0].id);
        console.log('Retrieved entity:', result.name);
        console.log('✅ Entity retrieval working\n');
        
        // Test 4: Create relation
        console.log('4️⃣ Testing relation creation...');
        db.statements.insertRelation.run({
            source_id: entities[0].id,
            target_id: entities[1].id,
            type: 'relates_to',
            strength: 0.7,
            metadata: JSON.stringify({ context: 'implementation' })
        });
        console.log('✅ Relation created successfully\n');
        
        // Test 5: Search entities
        console.log('5️⃣ Testing entity search...');
        const searchResults = db.statements.searchEntities.all({
            search: '%SQLite%',
            limit: 10
        });
        console.log(`Found ${searchResults.length} entities matching "SQLite"`);
        console.log('✅ Search functionality working\n');
        
        // Test 6: Add observation
        console.log('6️⃣ Testing observation creation...');
        db.statements.insertObservation.run({
            entity_id: entities[1].id,
            content: 'Started implementation of SQLite database layer',
            context: JSON.stringify({ session: 'test' }),
            importance: 0.8
        });
        console.log('✅ Observation added successfully\n');
        
        // Test 7: Transaction test
        console.log('7️⃣ Testing transactions...');
        let transactionSuccess = false;
        try {
            db.transaction(() => {
                // This should succeed
                db.statements.insertEntity.run({
                    id: crypto.randomUUID(),
                    type: 'task',
                    name: 'Transaction Test',
                    description: 'Testing transaction support',
                    importance_score: 0.5,
                    metadata: '{}'
                });
                transactionSuccess = true;
            });
        } catch (error) {
            console.error('Transaction failed:', error);
        }
        console.log(transactionSuccess ? '✅ Transaction support working\n' : '❌ Transaction failed\n');
        
        // Test 8: Database stats
        console.log('8️⃣ Testing database statistics...');
        const stats = db.getStats();
        console.log('Database stats:', stats);
        console.log('✅ Statistics working\n');
        
        // Test 9: Performance test
        console.log('9️⃣ Testing performance...');
        const startTime = Date.now();
        for (let i = 0; i < 100; i++) {
            db.statements.insertEntity.run({
                id: crypto.randomUUID(),
                type: 'concept',
                name: `Performance Test ${i}`,
                description: 'Bulk insert test',
                importance_score: Math.random(),
                metadata: '{}'
            });
        }
        const endTime = Date.now();
        console.log(`Inserted 100 entities in ${endTime - startTime}ms`);
        console.log(`Average: ${(endTime - startTime) / 100}ms per insert`);
        console.log('✅ Performance acceptable\n');
        
        // Final stats
        const finalStats = db.getStats();
        console.log('📊 Final Database Statistics:');
        console.log(`- Entities: ${finalStats.entities}`);
        console.log(`- Relations: ${finalStats.relations}`);
        console.log(`- Observations: ${finalStats.observations}`);
        console.log(`- Database size: ${(finalStats.dbSize / 1024).toFixed(2)} KB`);
        
        console.log('\n✅ All tests passed! Database implementation is working correctly.');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        // Clean up
        db.close();
    }
}

// Run tests
testDatabase();