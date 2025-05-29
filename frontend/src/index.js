// Import the API module
import { MemoryAPI } from './api/memoryApi.js';

// Import the framework
import '../framework.js';

// Import the main app logic
import './app.js';

// Initialize the application
window.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Superkraftmat Memory Manager initialized');
    
    // Check API health
    MemoryAPI.checkHealth()
        .then(health => {
            console.log('✅ API is healthy:', health);
        })
        .catch(error => {
            console.error('❌ API health check failed:', error);
        });
});