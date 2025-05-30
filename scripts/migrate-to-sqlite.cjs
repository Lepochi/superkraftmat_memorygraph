#!/usr/bin/env node

const path = require('path');
const JSONLToSQLiteConverter = require('../backend/src/database/migration/JSONLToSQLiteConverter');
const MigrationValidator = require('../backend/src/database/migration/validator');
const MigrationRollback = require('../backend/src/database/migration/rollback');

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0] || 'migrate';

const jsonlPath = path.join(__dirname, '../memory/data/memory.jsonl');
const dbPath = path.join(__dirname, '../memory/database/superkraft.db');

async function main() {
    console.log('🗄️  Superkraft Memory System - SQLite Migration Tool\n');
    
    switch (command) {
        case 'migrate':
            await runMigration();
            break;
            
        case 'validate':
            await runValidation();
            break;
            
        case 'rollback':
            await runRollback(args[1]);
            break;
            
        case 'list-backups':
            listBackups();
            break;
            
        case 'clean-backups':
            cleanBackups(args[1]);
            break;
            
        default:
            printUsage();
    }
}

async function runMigration() {
    try {
        // Run migration
        const converter = new JSONLToSQLiteConverter(jsonlPath, dbPath);
        const stats = await converter.migrate();
        
        // Validate results
        console.log('\n🔍 Running post-migration validation...');
        const validator = new MigrationValidator(jsonlPath, dbPath);
        const isValid = await validator.validate();
        
        if (!isValid) {
            console.log('\n⚠️  Migration completed with validation warnings.');
            console.log('Please review the issues above and decide if rollback is needed.');
        } else {
            console.log('\n✅ Migration completed and validated successfully!');
        }
        
    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        process.exit(1);
    }
}

async function runValidation() {
    try {
        const validator = new MigrationValidator(jsonlPath, dbPath);
        const isValid = await validator.validate();
        
        process.exit(isValid ? 0 : 1);
    } catch (error) {
        console.error('\n❌ Validation failed:', error.message);
        process.exit(1);
    }
}

async function runRollback(backupFile) {
    try {
        const rollback = new MigrationRollback(dbPath);
        
        if (!backupFile) {
            // List backups and exit
            const backups = rollback.listBackups();
            if (backups.length > 0) {
                console.log('\nTo rollback, run:');
                console.log(`  node scripts/migrate-to-sqlite.js rollback <backup-filename>`);
            }
            return;
        }
        
        await rollback.rollback(backupFile);
    } catch (error) {
        console.error('\n❌ Rollback failed:', error.message);
        process.exit(1);
    }
}

function listBackups() {
    const rollback = new MigrationRollback(dbPath);
    rollback.listBackups();
}

function cleanBackups(keepCount) {
    const rollback = new MigrationRollback(dbPath);
    rollback.cleanOldBackups(parseInt(keepCount) || 5);
}

function printUsage() {
    console.log('Usage: node scripts/migrate-to-sqlite.js [command] [options]');
    console.log('\nCommands:');
    console.log('  migrate         - Run the JSONL to SQLite migration (default)');
    console.log('  validate        - Validate the current database against JSONL');
    console.log('  rollback [file] - Rollback to a backup (lists backups if no file specified)');
    console.log('  list-backups    - List all available backups');
    console.log('  clean-backups [n] - Keep only the last n backups (default: 5)');
    console.log('\nExamples:');
    console.log('  node scripts/migrate-to-sqlite.js');
    console.log('  node scripts/migrate-to-sqlite.js validate');
    console.log('  node scripts/migrate-to-sqlite.js rollback');
    console.log('  node scripts/migrate-to-sqlite.js rollback pre-migration-2025-05-30.db');
    console.log('  node scripts/migrate-to-sqlite.js clean-backups 3');
}

// Run main function
main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});