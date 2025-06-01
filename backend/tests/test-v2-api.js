const axios = require('axios');

const BASE_URL = 'http://localhost:8000/api/v2/memory';

async function testV2Api() {
  console.log('Testing v2 API endpoints...\n');

  try {
    // Test 1: Get stats
    console.log('1. Testing GET /stats');
    const statsResponse = await axios.get(`${BASE_URL}/stats`);
    console.log('✅ Stats:', JSON.stringify(statsResponse.data, null, 2));

    // Test 2: List entities with pagination
    console.log('\n2. Testing GET /entities with pagination');
    const entitiesResponse = await axios.get(`${BASE_URL}/entities?page=1&limit=5`);
    console.log('✅ Entities:', JSON.stringify(entitiesResponse.data.pagination, null, 2));
    console.log(`   Found ${entitiesResponse.data.entities.length} entities`);

    // Test 3: Search entities
    console.log('\n3. Testing GET /search');
    const searchResponse = await axios.get(`${BASE_URL}/search?q=memory&strategy=fuzzy`);
    console.log('✅ Search results:', searchResponse.data.count, 'entities found');

    // Test 4: Get single entity (if any exist)
    if (entitiesResponse.data.entities.length > 0) {
      const entityId = entitiesResponse.data.entities[0].id;
      console.log(`\n4. Testing GET /entities/${entityId}`);
      const entityResponse = await axios.get(`${BASE_URL}/entities/${entityId}`);
      console.log('✅ Entity details:', entityResponse.data.name, `(${entityResponse.data.type})`);
    }

    // Test 5: Create new entity
    console.log('\n5. Testing POST /entities');
    const newEntity = {
      name: 'Test Entity ' + Date.now(),
      type: 'concept',
      metadata: { description: 'Created by v2 API test' }
    };
    
    try {
      const createResponse = await axios.post(`${BASE_URL}/entities`, newEntity);
      console.log('✅ Created entity:', createResponse.data.name, `(ID: ${createResponse.data.id})`);
      
      // Test 6: Update the entity
      console.log('\n6. Testing PUT /entities/:id');
      const updateResponse = await axios.put(`${BASE_URL}/entities/${createResponse.data.id}`, {
        importance: 75,
        metadata: { ...createResponse.data.metadata, updated: true }
      });
      console.log('✅ Updated entity importance to:', updateResponse.data.importance);
      
      // Test 7: Add observation
      console.log('\n7. Testing POST /entities/:id/observations');
      const obsResponse = await axios.post(`${BASE_URL}/entities/${createResponse.data.id}/observations`, {
        content: 'This is a test observation',
        importance: 60
      });
      console.log('✅ Added observation:', obsResponse.data.id);
      
      // Test 8: Delete the entity
      console.log('\n8. Testing DELETE /entities/:id');
      await axios.delete(`${BASE_URL}/entities/${createResponse.data.id}`);
      console.log('✅ Deleted test entity');
      
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('⚠️  Entity already exists (expected in some cases)');
      } else {
        throw error;
      }
    }

    // Test API version headers
    console.log('\n9. Testing API version headers');
    const infoResponse = await axios.get('/api/v2/info', { baseURL: 'http://localhost:8000' });
    console.log('✅ API Version:', infoResponse.headers['x-api-version']);
    console.log('✅ Available endpoints:', Object.keys(infoResponse.data.endpoints));

    console.log('\n✅ All v2 API tests passed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run tests
testV2Api().catch(console.error);