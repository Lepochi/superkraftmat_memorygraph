const fs = require('fs');
const path = require('path');
const DatabaseManager = require('../DatabaseManager');

class MigrationRollback {
    constructor(dbPath = null) {
        this.db = new DatabaseManager(dbPath);
        this.backupDir = path.join(__dirname, '../../../../memory/backups');
    }

    /**
     * List available backups
     */
    listBackups() {
        if (!fs.existsSync(this.backupDir)) {
            console.log('No backups found.');
            return [];
        }
        
        const backups = fs.readdirSync(this.backupDir)
            .filter(file => file.endsWith('.db'))
            .map(file => {
                const stats = fs.statSync(path.join(this.backupDir, file));
                return {
                    filename: file,
                    created: stats.mtime,
                    size: stats.size
                };
            })
            .sort((a, b) => b.created - a.created);
        
        console.log('\n📦 Available Backups:');
        console.log('═══════════════════════════════════════');
        backups.forEach((backup, index) => {
            console.log(`${index + 1}. ${backup.filename}`);
            console.log(`   Created: ${backup.created.toLocaleString()}`);
            console.log(`   Size: ${(backup.size / 1024).toFixed(2)} KB`);
        });
        
        return backups;
    }

    /**
     * Rollback to a specific backup
     */
    async rollback(backupFilename) {
        const backupPath = path.join(this.backupDir, backupFilename);
        
        if (!fs.existsSync(backupPath)) {
            throw new Error(`Backup file not found: ${backupFilename}`);
        }
        
        console.log(`\n🔄 Rolling back to: ${backupFilename}`);
        
        try {
            // Create a safety backup of current database
            const safetyBackup = await this.createSafetyBackup();
            console.log(`✅ Safety backup created: ${safetyBackup}`);
            
            // Close current connection
            this.db.close();
            
            // Replace current database with backup
            const currentDbPath = this.db.dbPath;
            
            // Remove current database files
            if (fs.existsSync(currentDbPath)) {
                fs.unlinkSync(currentDbPath);
            }
            if (fs.existsSync(currentDbPath + '-wal')) {
                fs.unlinkSync(currentDbPath + '-wal');
            }
            if (fs.existsSync(currentDbPath + '-shm')) {
                fs.unlinkSync(currentDbPath + '-shm');
            }
            
            // Copy backup to current location
            fs.copyFileSync(backupPath, currentDbPath);
            
            // Verify rollback
            this.db.connect();
            const stats = this.db.getStats();
            
            console.log('\n✅ Rollback completed successfully!');
            console.log('📊 Database stats after rollback:');
            console.log(`   Entities: ${stats.entities}`);
            console.log(`   Relations: ${stats.relations}`);
            console.log(`   Observations: ${stats.observations}`);
            
            return true;
        } catch (error) {
            console.error('❌ Rollback failed:', error);
            throw error;
        } finally {
            this.db.close();
        }
    }

    /**
     * Create a safety backup before rollback
     */
    async createSafetyBackup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFilename = `safety-backup-${timestamp}.db`;
        const backupPath = path.join(this.backupDir, backupFilename);
        
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
        
        this.db.connect();
        await this.db.backup(backupPath);
        this.db.close();
        
        return backupFilename;
    }

    /**
     * Clean old backups (keep last N backups)
     */
    cleanOldBackups(keepCount = 5) {
        const backups = this.listBackups();
        
        if (backups.length <= keepCount) {
            console.log(`\n✅ No cleanup needed. ${backups.length} backups found (keeping ${keepCount}).`);
            return;
        }
        
        const toDelete = backups.slice(keepCount);
        console.log(`\n🧹 Cleaning old backups (keeping last ${keepCount})...`);
        
        toDelete.forEach(backup => {
            const backupPath = path.join(this.backupDir, backup.filename);
            fs.unlinkSync(backupPath);
            console.log(`   ❌ Deleted: ${backup.filename}`);
        });
        
        console.log(`✅ Cleaned ${toDelete.length} old backups.`);
    }
}

module.exports = MigrationRollback;