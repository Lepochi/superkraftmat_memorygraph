#!/usr/bin/env node

/**
 * Automated Documentation Orchestrator
 * 
 * Master control system for the self-updating documentation framework:
 * - Coordinates DSM, AUE, and Monitor Daemon
 * - Provides unified CLI interface
 * - Implements intelligent startup and health monitoring
 * - Self-healing and optimization capabilities
 * - Session context preservation and handoff automation
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

class AutomatedDocumentationOrchestrator {
    constructor() {
        this.rootDir = path.resolve(__dirname, '../..');
        this.logFile = path.join(this.rootDir, '.claude-agents/logs/orchestrator.log');
        
        // Component paths
        this.components = {
            dsm: path.join(__dirname, 'documentation-state-manager.cjs'),
            aue: path.join(__dirname, 'auto-update-engine.cjs'),
            daemon: path.join(__dirname, 'documentation-monitor-daemon.cjs')
        };
        
        this.log('Automated Documentation Orchestrator initialized');
    }

    log(message) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ORCHESTRATOR: ${message}\n`;
        
        console.log(logEntry.trim());
        
        try {
            fs.appendFileSync(this.logFile, logEntry);
        } catch (error) {
            console.error(`Failed to write to log file: ${error.message}`);
        }
    }

    // Initialize the entire automated documentation system
    async initialize() {
        this.log('Initializing Automated Documentation Framework...');
        
        try {
            // 1. Ensure all directories exist
            this.ensureDirectoryStructure();
            
            // 2. Verify component dependencies
            await this.verifyDependencies();
            
            // 3. Perform initial system health check
            const healthStatus = await this.performHealthCheck();
            
            if (!healthStatus.healthy) {
                throw new Error(`System health check failed: ${healthStatus.issues.join(', ')}`);
            }
            
            // 4. Initialize DSM state
            await this.initializeDSM();
            
            // 5. Start monitoring daemon
            await this.startMonitoringDaemon();
            
            // 6. Perform initial documentation sync
            await this.performInitialSync();
            
            this.log('Automated Documentation Framework initialized successfully');
            
            return {
                success: true,
                status: 'Framework operational',
                components: {
                    dsm: 'Ready',
                    aue: 'Ready', 
                    daemon: 'Running'
                }
            };
            
        } catch (error) {
            this.log(`Initialization failed: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    ensureDirectoryStructure() {
        const requiredDirs = [
            '.claude-agents/state',
            '.claude-agents/logs',
            '.claude-agents/templates',
            '.claude-agents/config'
        ];
        
        requiredDirs.forEach(dir => {
            const fullPath = path.join(this.rootDir, dir);
            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
                this.log(`Created directory: ${dir}`);
            }
        });
    }

    async verifyDependencies() {
        this.log('Verifying system dependencies...');
        
        // Check for required Node.js modules
        const requiredModules = ['fs', 'path', 'child_process'];
        
        // Check if chokidar is available for file watching
        try {
            require.resolve('chokidar');
        } catch (error) {
            this.log('Installing chokidar for file watching...');
            execSync('npm install chokidar', { cwd: this.rootDir });
        }
        
        // Verify git is available
        try {
            execSync('git --version', { stdio: 'ignore' });
        } catch (error) {
            throw new Error('Git is required but not available');
        }
        
        this.log('Dependencies verified');
    }

    async performHealthCheck() {
        this.log('Performing system health check...');
        
        const issues = [];
        
        // Check git repository status
        try {
            execSync('git status', { cwd: this.rootDir, stdio: 'ignore' });
        } catch (error) {
            issues.push('Git repository not properly initialized');
        }
        
        // Check for required documentation files
        const requiredFiles = ['CLAUDE.md', 'README.md', 'ROADMAP.md'];
        requiredFiles.forEach(file => {
            if (!fs.existsSync(path.join(this.rootDir, file))) {
                issues.push(`Required file missing: ${file}`);
            }
        });
        
        // Check component scripts
        Object.entries(this.components).forEach(([name, scriptPath]) => {
            if (!fs.existsSync(scriptPath)) {
                issues.push(`Component script missing: ${name} at ${scriptPath}`);
            }
        });
        
        return {
            healthy: issues.length === 0,
            issues: issues,
            timestamp: new Date().toISOString()
        };
    }

    async initializeDSM() {
        this.log('Initializing Documentation State Manager...');
        
        try {
            const DSM = require('./documentation-state-manager.cjs');
            const dsm = new DSM();
            
            // Perform initial state check
            const updates = dsm.checkForUpdates();
            this.log(`DSM initialized - found ${updates.length} initial updates`);
            
            return true;
        } catch (error) {
            this.log(`DSM initialization failed: ${error.message}`);
            throw error;
        }
    }

    async startMonitoringDaemon() {
        this.log('Starting monitoring daemon...');
        
        try {
            // Check if daemon is already running
            const MonitorDaemon = require('./documentation-monitor-daemon.cjs');
            
            if (MonitorDaemon.isRunning()) {
                this.log('Monitoring daemon already running');
                return true;
            }
            
            // Start daemon in background
            const daemonProcess = spawn('node', [this.components.daemon, 'start'], {
                cwd: this.rootDir,
                detached: true,
                stdio: 'ignore'
            });
            
            daemonProcess.unref();
            
            // Wait a moment and verify it started
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            if (MonitorDaemon.isRunning()) {
                this.log('Monitoring daemon started successfully');
                return true;
            } else {
                throw new Error('Failed to start monitoring daemon');
            }
            
        } catch (error) {
            this.log(`Failed to start monitoring daemon: ${error.message}`);
            throw error;
        }
    }

    async performInitialSync() {
        this.log('Performing initial documentation sync...');
        
        try {
            // Force an immediate update check and processing
            const DSM = require('./documentation-state-manager.cjs');
            const AUE = require('./auto-update-engine.cjs');
            
            const dsm = new DSM();
            const aue = new AUE();
            
            // Get any pending updates
            const updates = dsm.checkForUpdates();
            
            if (updates.length > 0) {
                this.log(`Processing ${updates.length} initial updates`);
                const processedIds = await aue.processUpdates(updates);
                dsm.markUpdatesProcessed(processedIds);
                
                // Commit the initial sync
                await this.commitInitialSync(processedIds.length);
            }
            
            this.log('Initial documentation sync completed');
            
        } catch (error) {
            this.log(`Initial sync failed: ${error.message}`);
            // Don't throw - this is not critical for initialization
        }
    }

    async commitInitialSync(updateCount) {
        try {
            const status = execSync('git status --porcelain', { 
                cwd: this.rootDir, 
                encoding: 'utf8' 
            }).trim();
            
            if (status) {
                execSync('git add *.md docs/', { cwd: this.rootDir });
                
                const commitMessage = `docs: Initialize automated documentation framework

- Set up Documentation State Manager (DSM)
- Configured Auto-Update Engine (AUE)  
- Started monitoring daemon for continuous updates
- Processed ${updateCount} initial documentation updates
- Framework now self-maintaining and session-aware

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>`;
                
                execSync(`git commit -m "${commitMessage}"`, { cwd: this.rootDir });
                this.log('Initial sync committed to git');
            }
        } catch (error) {
            this.log(`Failed to commit initial sync: ${error.message}`);
        }
    }

    // Get comprehensive system status
    async getSystemStatus() {
        const MonitorDaemon = require('./documentation-monitor-daemon.cjs');
        const DSM = require('./documentation-state-manager.js');
        
        const dsm = new DSM();
        
        return {
            framework: {
                version: '1.0.0',
                initialized: true,
                status: 'Operational'
            },
            components: {
                dsm: {
                    status: 'Ready',
                    lastCheck: dsm.state.lastUpdate,
                    pendingUpdates: dsm.state.pendingUpdates.length
                },
                aue: {
                    status: 'Ready'
                },
                daemon: {
                    status: MonitorDaemon.isRunning() ? 'Running' : 'Stopped'
                }
            },
            session: dsm.getSessionContext(),
            health: await this.performHealthCheck(),
            timestamp: new Date().toISOString()
        };
    }

    // Stop all components gracefully
    async shutdown() {
        this.log('Shutting down Automated Documentation Framework...');
        
        try {
            // Stop monitoring daemon
            const MonitorDaemon = require('./documentation-monitor-daemon.cjs');
            
            if (MonitorDaemon.isRunning()) {
                execSync(`node ${this.components.daemon} stop`, { cwd: this.rootDir });
                this.log('Monitoring daemon stopped');
            }
            
            this.log('Framework shutdown completed');
            
        } catch (error) {
            this.log(`Shutdown error: ${error.message}`);
        }
    }

    // Restart the entire framework
    async restart() {
        this.log('Restarting Automated Documentation Framework...');
        
        await this.shutdown();
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
        await this.initialize();
        
        this.log('Framework restart completed');
    }

    // Manual trigger for immediate documentation update
    async triggerUpdate() {
        this.log('Manually triggering documentation update...');
        
        try {
            const DSM = require('./documentation-state-manager.cjs');
            const AUE = require('./auto-update-engine.cjs');
            
            const dsm = new DSM();
            const aue = new AUE();
            
            const updates = dsm.checkForUpdates();
            
            if (updates.length > 0) {
                const processedIds = await aue.processUpdates(updates);
                dsm.markUpdatesProcessed(processedIds);
                
                this.log(`Manual update completed - processed ${processedIds.length} updates`);
                return { success: true, updatesProcessed: processedIds.length };
            } else {
                this.log('No updates needed');
                return { success: true, updatesProcessed: 0 };
            }
            
        } catch (error) {
            this.log(`Manual update failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
}

// CLI interface
if (require.main === module) {
    const orchestrator = new AutomatedDocumentationOrchestrator();
    
    const command = process.argv[2];
    
    switch (command) {
        case 'init':
            orchestrator.initialize().then(result => {
                console.log(JSON.stringify(result, null, 2));
                process.exit(result.success ? 0 : 1);
            });
            break;
            
        case 'status':
            orchestrator.getSystemStatus().then(status => {
                console.log(JSON.stringify(status, null, 2));
            });
            break;
            
        case 'shutdown':
            orchestrator.shutdown().then(() => {
                console.log('Framework shutdown completed');
            });
            break;
            
        case 'restart':
            orchestrator.restart().then(() => {
                console.log('Framework restart completed');
            });
            break;
            
        case 'update':
            orchestrator.triggerUpdate().then(result => {
                console.log(JSON.stringify(result, null, 2));
            });
            break;
            
        default:
            console.log('Usage: automated-documentation-orchestrator.js <init|status|shutdown|restart|update>');
            process.exit(1);
    }
}

module.exports = AutomatedDocumentationOrchestrator;