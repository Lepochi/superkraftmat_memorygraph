// Import the API module (v2 with v1 compatibility)
import { MemoryAPI } from './api/memoryApiV2.js';

// Import the framework
import '../framework.js';

// Import the main app logic
import './app.js';

// Initialize the application
window.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Superkraftmat Memory Manager initialized');
    
    // Check URL params for API version
    const urlParams = new URLSearchParams(window.location.search);
    const apiVersion = urlParams.get('api') || 'v2'; // Default to v2
    
    if (apiVersion === 'v1' || apiVersion === 'v2') {
        MemoryAPI.setApiVersion(apiVersion);
        console.log(`📡 Using API ${apiVersion}`);
    }
    
    // Check API health
    MemoryAPI.checkHealth()
        .then(health => {
            console.log('✅ API is healthy:', health);
            
            // If v2, also get stats
            if (apiVersion === 'v2') {
                return MemoryAPI.getStats();
            }
        })
        .then(stats => {
            if (stats) {
                console.log('📊 Database stats:', stats);
            }
        })
        .catch(error => {
            console.error('❌ API health check failed:', error);
        });
});