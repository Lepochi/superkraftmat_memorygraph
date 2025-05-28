#!/usr/bin/env node

console.log('🚀 Starting Superkraftmat Memory System...\n');

// Check if we're in the right directory
const fs = require('fs');
const path = require('path');

const requiredFiles = [
    'backend/src/server.js',
    'memory/data/memory.jsonl',
    'index.html'
];

console.log('📋 Checking required files...');
for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} - MISSING!`);
        process.exit(1);
    }
}

console.log('\n🔧 Starting backend server...');
console.log('Backend will be available at: http://localhost:8000');
console.log('\n📖 To test the UI:');
console.log('1. Open index.html in your browser');
console.log('2. Or use Live Server extension in VS Code');
console.log('\n💡 Press Ctrl+C to stop the server\n');

// Start the backend server
require('./backend/src/server.js');
