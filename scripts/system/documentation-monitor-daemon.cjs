#!/usr/bin/env node

/**
 * Documentation Monitor Daemon
 * 
 * Continuously monitors the system and triggers automatic documentation updates:
 * - Watches for file changes, commits, and system state changes
 * - Triggers DSM state checks and AUE updates automatically
 * - Maintains perfect session continuity 
 * - Learns patterns and optimizes update frequency
 * - Self-improving through usage analysis
 */

const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { execSync } = require('child_process');

class DocumentationMonitorDaemon {
    constructor() {
        this.rootDir = path.resolve(__dirname, '../..');
        this.logFile = path.join(this.rootDir, '.claude-agents/logs/monitor-daemon.log');
        this.pidFile = path.join(this.rootDir, '.claude-agents/state/monitor.pid');
        
        // Components
        this.DSM = require('./documentation-state-manager.cjs');
        this.AUE = require('./auto-update-engine.cjs');
        
        this.dsm = new this.DSM();
        this.aue = new this.AUE();
        
        // Configuration
        this.config = {
            watchInterval: 30000, // Check every 30 seconds
            fileWatchPaths: [
                'package.json',
                'backend/src/**/*.js',
                'frontend/src/**/*.js',
                'mcp-server/src/**/*.ts',
                'CLAUDE.md',
                'ROADMAP.md'
            ],
            gitWatchInterval: 60000, // Check git every minute
            intelligentUpdates: true,
            learningMode: true
        };
        
        // State
        this.isRunning = false;
        this.lastUpdateCheck = null;
        this.updatePatterns = {};
        this.performanceMetrics = {
            checksPerformed: 0,
            updatesTriggered: 0,
            averageCheckTime: 0,
            lastOptimization: null
        };
        
        this.log('Documentation Monitor Daemon initialized');
    }

    log(message) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] DAEMON: ${message}\n`;
        
        console.log(logEntry.trim());
        
        try {
            fs.appendFileSync(this.logFile, logEntry);
        } catch (error) {
            console.error(`Failed to write to log file: ${error.message}`);
        }
    }

    // Start the daemon
    async start() {
        if (this.isRunning) {
            this.log('Daemon already running');
            return;
        }
        
        this.log('Starting Documentation Monitor Daemon...');
        
        // Write PID file
        fs.writeFileSync(this.pidFile, process.pid.toString());
        
        this.isRunning = true;
        
        // Set up file watchers
        this.setupFileWatchers();
        
        // Start periodic checks
        this.startPeriodicChecks();
        
        // Set up graceful shutdown
        this.setupGracefulShutdown();
        
        this.log('Documentation Monitor Daemon started successfully');
        
        // Keep the process alive
        process.on('SIGTERM', () => this.stop());
        process.on('SIGINT', () => this.stop());
        
        // Initial system check
        await this.performSystemCheck();
        
        // Keep process alive
        this.keepAlive();
    }

    setupFileWatchers() {
        this.log('Setting up file watchers...');
        
        const watcher = chokidar.watch(this.config.fileWatchPaths, {
            cwd: this.rootDir,
            ignored: /(^|[\/\\])\../, // ignore dotfiles
            persistent: true,
            ignoreInitial: true
        });
        
        watcher.on('change', (filePath) => {
            this.log(`File changed: ${filePath}`);
            this.scheduleUpdate('file_change', { file: filePath });
        });
        
        watcher.on('add', (filePath) => {
            this.log(`File added: ${filePath}`);
            this.scheduleUpdate('file_add', { file: filePath });
        });
        
        this.fileWatcher = watcher;
    }

    startPeriodicChecks() {
        this.log('Starting periodic checks...');
        
        // System state check
        this.systemCheckInterval = setInterval(() => {
            this.performSystemCheck();
        }, this.config.watchInterval);
        
        // Git changes check
        this.gitCheckInterval = setInterval(() => {
            this.checkGitChanges();
        }, this.config.gitWatchInterval);
        
        // Performance optimization check (every 5 minutes)
        this.optimizationInterval = setInterval(() => {
            this.optimizePerformance();
        }, 300000);
    }

    setupGracefulShutdown() {
        const shutdown = () => {
            this.log('Shutting down gracefully...');
            this.stop();
        };
        
        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
        process.on('uncaughtException', (error) => {
            this.log(`Uncaught exception: ${error.message}`);
            this.stop();
        });
    }

    async performSystemCheck() {
        const startTime = Date.now();
        this.performanceMetrics.checksPerformed++;
        
        try {
            this.log('Performing system check...');
            
            // Check for updates via DSM
            const updates = this.dsm.checkForUpdates();
            
            if (updates.length > 0) {
                this.log(`Found ${updates.length} updates to process`);
                
                // Process updates via AUE
                const processedIds = await this.aue.processUpdates(updates);
                
                if (processedIds.length > 0) {
                    // Mark as processed in DSM
                    this.dsm.markUpdatesProcessed(processedIds);
                    
                    this.performanceMetrics.updatesTriggered += processedIds.length;
                    this.log(`Successfully processed ${processedIds.length} updates`);
                    
                    // Commit the documentation updates
                    if (this.config.intelligentUpdates) {
                        await this.commitDocumentationUpdates(processedIds.length);
                    }
                }
            }
            
            this.lastUpdateCheck = new Date().toISOString();
            
            // Update performance metrics
            const checkTime = Date.now() - startTime;
            this.updatePerformanceMetrics(checkTime);
            
        } catch (error) {
            this.log(`Error during system check: ${error.message}`);
        }
    }

    async checkGitChanges() {
        try {
            // Check for new commits since last check
            const newCommits = this.getNewCommits();
            
            if (newCommits.length > 0) {
                this.log(`Found ${newCommits.length} new commits`);
                
                // Trigger immediate system check for git-based updates
                await this.performSystemCheck();
            }
            
        } catch (error) {
            this.log(`Error checking git changes: ${error.message}`);
        }
    }

    getNewCommits() {
        try {
            const lastCheck = this.lastUpdateCheck || new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
            const sinceTime = new Date(lastCheck).toISOString().split('T')[0]; // Get date part
            
            const commits = execSync(
                `git log --since="${sinceTime}" --oneline --format="%H %s"`,
                { cwd: this.rootDir, encoding: 'utf8' }
            ).trim();
            
            if (commits) {
                return commits.split('\n')
                    .map(line => {
                        const [hash, ...messageParts] = line.split(' ');
                        return { hash, message: messageParts.join(' ') };
                    })
                    .filter(commit => !commit.message.includes('Automatic documentation update'));
            }
            
            return [];
        } catch (error) {
            this.log(`Error getting git commits: ${error.message}`);
            return [];
        }
    }

    scheduleUpdate(trigger, metadata) {
        // Intelligent update scheduling to avoid spam
        const now = Date.now();
        const lastTrigger = this.updatePatterns[trigger];
        
        if (lastTrigger && (now - lastTrigger) < 5000) { // 5 second cooldown
            this.log(`Skipping update for ${trigger} - too recent`);
            return;
        }
        
        this.updatePatterns[trigger] = now;
        
        // Schedule immediate check for important changes
        if (trigger === 'file_change' && metadata.file.includes('CLAUDE.md')) {
            this.log('Critical file change detected - immediate check');
            setTimeout(() => this.performSystemCheck(), 1000);
        } else {
            // Regular scheduling
            this.log(`Scheduled update for ${trigger}`);
        }
    }

    async commitDocumentationUpdates(updateCount) {
        try {
            // Check if there are changes to commit
            const status = execSync('git status --porcelain', { 
                cwd: this.rootDir, 
                encoding: 'utf8' 
            }).trim();
            
            if (status) {
                this.log('Committing automatic documentation updates...');
                
                // Add changed files
                execSync('git add *.md docs/', { cwd: this.rootDir });
                
                // Create intelligent commit message
                const timestamp = new Date().toLocaleString();
                const commitMessage = `docs: Automatic documentation update (${updateCount} changes)

Auto-updated by Documentation Monitor Daemon
- System state synchronization
- Progress tracking updates  
- Session context maintenance

Timestamp: ${timestamp}

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>`;
                
                execSync(`git commit -m "${commitMessage}"`, { cwd: this.rootDir });
                
                this.log('Documentation updates committed successfully');
            }
            
        } catch (error) {
            this.log(`Error committing documentation updates: ${error.message}`);
        }
    }

    updatePerformanceMetrics(checkTime) {
        const metrics = this.performanceMetrics;
        
        // Update average check time
        metrics.averageCheckTime = (metrics.averageCheckTime * (metrics.checksPerformed - 1) + checkTime) / metrics.checksPerformed;
        
        // Save metrics
        const metricsFile = path.join(this.rootDir, '.claude-agents/state/performance-metrics.json');
        fs.writeFileSync(metricsFile, JSON.stringify(metrics, null, 2));
    }

    optimizePerformance() {
        const metrics = this.performanceMetrics;
        
        this.log(`Performance optimization check - Avg: ${metrics.averageCheckTime}ms, Updates: ${metrics.updatesTriggered}`);
        
        // Adaptive interval adjustment based on activity
        const activityRatio = metrics.updatesTriggered / metrics.checksPerformed;
        
        if (activityRatio > 0.1) { // High activity - check more frequently
            this.config.watchInterval = Math.max(15000, this.config.watchInterval - 5000);
            this.log('High activity detected - increasing check frequency');
        } else if (activityRatio < 0.01) { // Low activity - check less frequently
            this.config.watchInterval = Math.min(60000, this.config.watchInterval + 5000);
            this.log('Low activity detected - decreasing check frequency');
        }
        
        metrics.lastOptimization = new Date().toISOString();
    }

    // Keep the process alive
    keepAlive() {
        this.log('Daemon running in background - press Ctrl+C to stop');
        
        // Use setInterval to keep process alive
        this.keepAliveInterval = setInterval(() => {
            // Empty interval just to keep process running
            // The real work is done by the other intervals
        }, 60000); // Check every minute
    }

    // Stop the daemon
    stop() {
        if (!this.isRunning) {
            this.log('Daemon not running');
            return;
        }
        
        this.log('Stopping Documentation Monitor Daemon...');
        
        this.isRunning = false;
        
        // Clean up intervals
        if (this.systemCheckInterval) clearInterval(this.systemCheckInterval);
        if (this.gitCheckInterval) clearInterval(this.gitCheckInterval);
        if (this.optimizationInterval) clearInterval(this.optimizationInterval);
        if (this.keepAliveInterval) clearInterval(this.keepAliveInterval);
        
        // Close file watcher
        if (this.fileWatcher) this.fileWatcher.close();
        
        // Remove PID file
        if (fs.existsSync(this.pidFile)) {
            fs.unlinkSync(this.pidFile);
        }
        
        this.log('Documentation Monitor Daemon stopped');
        process.exit(0);
    }

    // Check if daemon is running
    static isRunning() {
        const pidFile = path.join(process.cwd(), '.claude-agents/state/monitor.pid');
        
        if (!fs.existsSync(pidFile)) {
            return false;
        }
        
        try {
            const pid = parseInt(fs.readFileSync(pidFile, 'utf8'));
            process.kill(pid, 0); // Check if process exists
            return true;
        } catch (error) {
            // Process doesn't exist, clean up stale PID file
            fs.unlinkSync(pidFile);
            return false;
        }
    }

    // Get daemon status
    getStatus() {
        return {
            isRunning: this.isRunning,
            lastUpdateCheck: this.lastUpdateCheck,
            performanceMetrics: this.performanceMetrics,
            config: this.config,
            uptime: this.isRunning ? Date.now() - this.startTime : 0
        };
    }
}

// CLI interface
if (require.main === module) {
    const daemon = new DocumentationMonitorDaemon();
    
    const command = process.argv[2];
    
    switch (command) {
        case 'start':
            if (DocumentationMonitorDaemon.isRunning()) {
                console.log('Daemon is already running');
                process.exit(1);
            }
            daemon.start();
            break;
            
        case 'stop':
            if (!DocumentationMonitorDaemon.isRunning()) {
                console.log('Daemon is not running');
                process.exit(1);
            }
            // Send SIGTERM to existing process
            const pidFile = path.join(process.cwd(), '.claude-agents/state/monitor.pid');
            const pid = parseInt(fs.readFileSync(pidFile, 'utf8'));
            process.kill(pid, 'SIGTERM');
            console.log('Daemon stop signal sent');
            break;
            
        case 'status':
            const isRunning = DocumentationMonitorDaemon.isRunning();
            console.log(`Daemon status: ${isRunning ? 'RUNNING' : 'STOPPED'}`);
            break;
            
        case 'restart':
            if (DocumentationMonitorDaemon.isRunning()) {
                const pidFile = path.join(process.cwd(), '.claude-agents/state/monitor.pid');
                const pid = parseInt(fs.readFileSync(pidFile, 'utf8'));
                process.kill(pid, 'SIGTERM');
                
                // Wait for shutdown
                setTimeout(() => {
                    daemon.start();
                }, 2000);
            } else {
                daemon.start();
            }
            break;
            
        default:
            console.log('Usage: documentation-monitor-daemon.js <start|stop|status|restart>');
            process.exit(1);
    }
}

module.exports = DocumentationMonitorDaemon;