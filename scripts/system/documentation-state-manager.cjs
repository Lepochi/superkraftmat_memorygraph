#!/usr/bin/env node

/**
 * Documentation State Manager (DSM)
 * 
 * Core component of the Automated Documentation Framework that:
 * - Monitors system state changes (file changes, task completions, phase progress)
 * - Maintains documentation dependency graph
 * - Triggers appropriate updates based on events
 * - Preserves session context across CLI handoffs
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DocumentationStateManager {
    constructor() {
        this.rootDir = path.resolve(__dirname, '../..');
        this.stateFile = path.join(this.rootDir, '.claude-agents/state/documentation-state.json');
        this.logFile = path.join(this.rootDir, '.claude-agents/logs/dsm.log');
        
        // Ensure directories exist
        this.ensureDirectories();
        
        // Load or initialize state
        this.state = this.loadState();
        
        // Documentation dependency graph
        this.dependencies = this.buildDependencyGraph();
        
        this.log('DSM initialized');
    }

    ensureDirectories() {
        const dirs = [
            '.claude-agents/state',
            '.claude-agents/logs'
        ];
        
        dirs.forEach(dir => {
            const fullPath = path.join(this.rootDir, dir);
            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
            }
        });
    }

    loadState() {
        try {
            if (fs.existsSync(this.stateFile)) {
                return JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
            }
        } catch (error) {
            this.log(`Error loading state: ${error.message}`);
        }
        
        // Default state
        return {
            lastUpdate: new Date().toISOString(),
            documentationVersion: '1.0.0',
            fileHashes: {},
            taskCompletions: [],
            phaseProgress: {},
            sessionContext: {},
            pendingUpdates: [],
            autoUpdateEnabled: true
        };
    }

    saveState() {
        try {
            fs.writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2));
            this.log('State saved successfully');
        } catch (error) {
            this.log(`Error saving state: ${error.message}`);
        }
    }

    buildDependencyGraph() {
        return {
            // Primary documentation files and their triggers
            'CLAUDE.md': [
                'phase_completion',
                'critical_issues',
                'environment_changes',
                'file_structure_changes',
                'task_completion'
            ],
            'ROADMAP.md': [
                'milestone_completion',
                'strategic_direction_change',
                'high_level_priorities'
            ],
            'docs/development/session-handoff.md': [
                'session_end',
                'task_handoff',
                'current_priority_change'
            ],
            'README.md': [
                'core_feature_changes',
                'installation_process_changes',
                'architecture_major_changes'
            ],
            'docs/context/current-state.md': [
                'phase_progress',
                'implementation_status',
                'system_metrics'
            ],
            'docs/development/automated-documentation-framework.md': [
                'framework_improvements',
                'new_automation_rules',
                'template_updates'
            ]
        };
    }

    log(message) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] DSM: ${message}\n`;
        
        console.log(logEntry.trim());
        
        try {
            fs.appendFileSync(this.logFile, logEntry);
        } catch (error) {
            console.error(`Failed to write to log file: ${error.message}`);
        }
    }

    // Monitor file changes and detect what needs updating
    checkForUpdates() {
        this.log('Checking for updates...');
        
        const updates = [];
        
        // Check for file changes
        const fileChanges = this.detectFileChanges();
        if (fileChanges.length > 0) {
            updates.push(...this.mapFileChangesToUpdates(fileChanges));
        }
        
        // Check for task completions
        const taskCompletions = this.detectTaskCompletions();
        if (taskCompletions.length > 0) {
            updates.push(...this.mapTaskCompletionsToUpdates(taskCompletions));
        }
        
        // Check for phase progress
        const phaseChanges = this.detectPhaseProgress();
        if (phaseChanges.length > 0) {
            updates.push(...this.mapPhaseChangesToUpdates(phaseChanges));
        }
        
        // Add to pending updates
        this.state.pendingUpdates.push(...updates);
        this.saveState();
        
        if (updates.length > 0) {
            this.log(`Found ${updates.length} pending updates`);
            return updates;
        }
        
        this.log('No updates needed');
        return [];
    }

    detectFileChanges() {
        const changes = [];
        const criticalFiles = [
            'package.json',
            'backend/package.json',
            'frontend/package.json',
            'mcp-server/package.json',
            'backend/src/server.js',
            'backend/src/routes/v2/memory.js',
            'frontend/src/app.js',
            'mcp-server/src/index.ts'
        ];
        
        criticalFiles.forEach(file => {
            const filePath = path.join(this.rootDir, file);
            if (fs.existsSync(filePath)) {
                const currentHash = this.calculateFileHash(filePath);
                const previousHash = this.state.fileHashes[file];
                
                if (previousHash && currentHash !== previousHash) {
                    changes.push({
                        file,
                        type: 'modified',
                        hash: currentHash
                    });
                } else if (!previousHash) {
                    changes.push({
                        file,
                        type: 'new',
                        hash: currentHash
                    });
                }
                
                this.state.fileHashes[file] = currentHash;
            }
        });
        
        return changes;
    }

    calculateFileHash(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const crypto = require('crypto');
            return crypto.createHash('md5').update(content).digest('hex');
        } catch (error) {
            this.log(`Error calculating hash for ${filePath}: ${error.message}`);
            return null;
        }
    }

    detectTaskCompletions() {
        // Check if any new tasks have been completed by looking at TodoWrite calls
        // This would integrate with the TodoWrite system to detect completions
        const completions = [];
        
        // For now, we'll detect based on git commits with "feat:" or "fix:" prefixes
        try {
            const recentCommits = execSync('git log --oneline -5', { cwd: this.rootDir, encoding: 'utf8' });
            const commitLines = recentCommits.trim().split('\n');
            
            commitLines.forEach(line => {
                // Skip automatic documentation commits to prevent infinite loops
                if (line.includes('Automatic documentation update')) {
                    return;
                }
                
                if (line.includes('feat:') || line.includes('fix:') || line.includes('docs:')) {
                    const commitHash = line.split(' ')[0];
                    
                    if (!this.state.taskCompletions.includes(commitHash)) {
                        completions.push({
                            type: 'commit',
                            hash: commitHash,
                            message: line,
                            timestamp: new Date().toISOString()
                        });
                        
                        this.state.taskCompletions.push(commitHash);
                    }
                }
            });
        } catch (error) {
            this.log(`Error checking git commits: ${error.message}`);
        }
        
        return completions;
    }

    detectPhaseProgress() {
        // Analyze CLAUDE.md for phase completion status changes
        const changes = [];
        
        try {
            const claudePath = path.join(this.rootDir, 'CLAUDE.md');
            if (fs.existsSync(claudePath)) {
                const content = fs.readFileSync(claudePath, 'utf8');
                
                // Extract phase completion percentages
                const phaseRegex = /Phase \d+.*?(\d+%|\d+\/\d+|COMPLETE|IN PROGRESS)/gi;
                const matches = content.match(phaseRegex) || [];
                
                matches.forEach(match => {
                    const phaseId = match.match(/Phase (\d+)/i)?.[1];
                    if (phaseId) {
                        const currentStatus = match;
                        const previousStatus = this.state.phaseProgress[phaseId];
                        
                        if (previousStatus !== currentStatus) {
                            changes.push({
                                phase: phaseId,
                                oldStatus: previousStatus,
                                newStatus: currentStatus,
                                timestamp: new Date().toISOString()
                            });
                            
                            this.state.phaseProgress[phaseId] = currentStatus;
                        }
                    }
                });
            }
        } catch (error) {
            this.log(`Error detecting phase progress: ${error.message}`);
        }
        
        return changes;
    }

    mapFileChangesToUpdates(changes) {
        const updates = [];
        
        changes.forEach(change => {
            // Map specific file changes to documentation updates
            if (change.file.includes('package.json')) {
                updates.push({
                    type: 'update_dependencies',
                    target: 'CLAUDE.md',
                    reason: `Dependency changes in ${change.file}`,
                    priority: 'medium',
                    timestamp: new Date().toISOString()
                });
            }
            
            if (change.file.includes('server.js') || change.file.includes('app.js')) {
                updates.push({
                    type: 'update_architecture',
                    target: 'README.md',
                    reason: `Core file changes in ${change.file}`,
                    priority: 'high',
                    timestamp: new Date().toISOString()
                });
            }
        });
        
        return updates;
    }

    mapTaskCompletionsToUpdates(completions) {
        const updates = [];
        
        completions.forEach(completion => {
            updates.push({
                type: 'update_progress',
                target: 'CLAUDE.md',
                reason: `Task completion: ${completion.message}`,
                priority: 'high',
                timestamp: completion.timestamp,
                metadata: completion
            });
            
            // Also update session handoff for context
            updates.push({
                type: 'update_session_context',
                target: 'docs/development/session-handoff.md',
                reason: `Session progress: ${completion.message}`,
                priority: 'medium',
                timestamp: completion.timestamp,
                metadata: completion
            });
        });
        
        return updates;
    }

    mapPhaseChangesToUpdates(changes) {
        const updates = [];
        
        changes.forEach(change => {
            updates.push({
                type: 'update_phase_progress',
                target: 'CLAUDE.md',
                reason: `Phase ${change.phase} status changed from ${change.oldStatus} to ${change.newStatus}`,
                priority: 'high',
                timestamp: change.timestamp,
                metadata: change
            });
            
            // Also update roadmap for strategic view
            updates.push({
                type: 'update_strategic_progress',
                target: 'ROADMAP.md',
                reason: `Phase ${change.phase} milestone reached`,
                priority: 'medium',
                timestamp: change.timestamp,
                metadata: change
            });
        });
        
        return updates;
    }

    // Get pending updates for processing
    getPendingUpdates() {
        return this.state.pendingUpdates;
    }

    // Mark updates as processed
    markUpdatesProcessed(updateIds) {
        this.state.pendingUpdates = this.state.pendingUpdates.filter(
            update => !updateIds.includes(update.timestamp)
        );
        this.saveState();
        this.log(`Marked ${updateIds.length} updates as processed`);
    }

    // Get current session context
    getSessionContext() {
        return {
            currentTask: this.getCurrentTask(),
            lastUpdate: this.state.lastUpdate,
            pendingUpdatesCount: this.state.pendingUpdates.length,
            recentCompletions: this.state.taskCompletions.slice(-5),
            phaseStatus: this.state.phaseProgress
        };
    }

    getCurrentTask() {
        // Analyze recent activity to determine current focus
        const recentUpdates = this.state.pendingUpdates.slice(-3);
        if (recentUpdates.length > 0) {
            const themes = recentUpdates.map(u => u.reason).join(' ');
            
            if (themes.includes('cleanup') || themes.includes('consolidation')) {
                return 'Repository Cleanup & Optimization';
            } else if (themes.includes('phase') || themes.includes('progress')) {
                return 'Phase Implementation';
            } else if (themes.includes('automation') || themes.includes('framework')) {
                return 'Automation Framework Development';
            }
        }
        
        return 'System Maintenance';
    }

    // Update session context
    updateSessionContext(context) {
        this.state.sessionContext = {
            ...this.state.sessionContext,
            ...context,
            timestamp: new Date().toISOString()
        };
        this.saveState();
        this.log('Session context updated');
    }
}

// CLI interface
if (require.main === module) {
    const dsm = new DocumentationStateManager();
    
    const command = process.argv[2];
    
    switch (command) {
        case 'check':
            const updates = dsm.checkForUpdates();
            console.log(JSON.stringify(updates, null, 2));
            break;
            
        case 'status':
            const context = dsm.getSessionContext();
            console.log(JSON.stringify(context, null, 2));
            break;
            
        case 'pending':
            const pending = dsm.getPendingUpdates();
            console.log(JSON.stringify(pending, null, 2));
            break;
            
        default:
            console.log('Usage: documentation-state-manager.js <check|status|pending>');
            process.exit(1);
    }
}

module.exports = DocumentationStateManager;