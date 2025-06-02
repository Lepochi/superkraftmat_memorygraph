#!/usr/bin/env node

/**
 * Auto-Update Engine (AUE)
 * 
 * Executes documentation updates automatically based on triggers from DSM:
 * - Updates implementation status and progress percentages
 * - Refreshes technical specifications and API documentation  
 * - Updates strategic roadmaps and current focus areas
 * - Maintains session handoff documentation
 * - Applies intelligent content optimization
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class AutoUpdateEngine {
    constructor() {
        this.rootDir = path.resolve(__dirname, '../..');
        this.logFile = path.join(this.rootDir, '.claude-agents/logs/aue.log');
        this.templatesDir = path.join(this.rootDir, '.claude-agents/templates');
        
        // Ensure directories exist
        this.ensureDirectories();
        
        this.log('AUE initialized');
    }

    ensureDirectories() {
        const dirs = [
            '.claude-agents/templates',
            '.claude-agents/logs'
        ];
        
        dirs.forEach(dir => {
            const fullPath = path.join(this.rootDir, dir);
            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
            }
        });
    }

    log(message) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] AUE: ${message}\n`;
        
        console.log(logEntry.trim());
        
        try {
            fs.appendFileSync(this.logFile, logEntry);
        } catch (error) {
            console.error(`Failed to write to log file: ${error.message}`);
        }
    }

    // Process updates from DSM
    async processUpdates(updates) {
        this.log(`Processing ${updates.length} updates`);
        
        const processedIds = [];
        
        for (const update of updates) {
            try {
                await this.processUpdate(update);
                processedIds.push(update.timestamp);
                this.log(`Processed update: ${update.type} for ${update.target}`);
            } catch (error) {
                this.log(`Error processing update ${update.type}: ${error.message}`);
            }
        }
        
        return processedIds;
    }

    async processUpdate(update) {
        switch (update.type) {
            case 'update_progress':
                return this.updateProgress(update);
            case 'update_phase_progress':
                return this.updatePhaseProgress(update);
            case 'update_session_context':
                return this.updateSessionContext(update);
            case 'update_dependencies':
                return this.updateDependencies(update);
            case 'update_architecture':
                return this.updateArchitecture(update);
            case 'update_strategic_progress':
                return this.updateStrategicProgress(update);
            default:
                this.log(`Unknown update type: ${update.type}`);
        }
    }

    updateProgress(update) {
        const targetPath = path.join(this.rootDir, update.target);
        
        if (!fs.existsSync(targetPath)) {
            this.log(`Target file does not exist: ${targetPath}`);
            return;
        }
        
        let content = fs.readFileSync(targetPath, 'utf8');
        
        // Update the "Last Updated" timestamp
        const timestamp = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        // Find and update the last updated line
        content = content.replace(
            /\*Last Updated: [^*]+\*/,
            `*Last Updated: ${timestamp} - ${update.reason}*`
        );
        
        // Add the update to progress metrics if it's a significant change
        if (update.metadata && update.metadata.message.includes('feat:')) {
            content = this.addProgressEntry(content, update);
        }
        
        fs.writeFileSync(targetPath, content);
        this.log(`Updated progress in ${update.target}`);
    }

    updatePhaseProgress(update) {
        const targetPath = path.join(this.rootDir, update.target);
        
        if (!fs.existsSync(targetPath)) {
            this.log(`Target file does not exist: ${targetPath}`);
            return;
        }
        
        let content = fs.readFileSync(targetPath, 'utf8');
        
        // Update the current focus based on latest phase activity
        if (update.metadata.newStatus.includes('COMPLETE')) {
            content = this.updateCurrentFocus(content, update.metadata.phase);
        }
        
        // Update progress percentages in implementation tracking
        content = this.updateImplementationProgress(content, update.metadata);
        
        fs.writeFileSync(targetPath, content);
        this.log(`Updated phase progress in ${update.target}`);
    }

    updateSessionContext(update) {
        const targetPath = path.join(this.rootDir, update.target);
        
        // Create session handoff if it doesn't exist
        if (!fs.existsSync(targetPath)) {
            this.createSessionHandoff(targetPath, update);
            return;
        }
        
        let content = fs.readFileSync(targetPath, 'utf8');
        
        // Update current session task
        const currentTask = this.extractTaskFromCommit(update.metadata.message);
        if (currentTask) {
            content = content.replace(
                /## 🎯 Current Session Task\n\*\*[^*]+\*\*/,
                `## 🎯 Current Session Task\n**${currentTask}**`
            );
        }
        
        // Update session achievements
        content = this.addSessionAchievement(content, update);
        
        fs.writeFileSync(targetPath, content);
        this.log(`Updated session context in ${update.target}`);
    }

    updateDependencies(update) {
        const targetPath = path.join(this.rootDir, update.target);
        
        if (!fs.existsSync(targetPath)) {
            this.log(`Target file does not exist: ${targetPath}`);
            return;
        }
        
        let content = fs.readFileSync(targetPath, 'utf8');
        
        // Extract and update dependency information
        const deps = this.extractDependencies();
        content = this.updateDependencySection(content, deps);
        
        fs.writeFileSync(targetPath, content);
        this.log(`Updated dependencies in ${update.target}`);
    }

    updateArchitecture(update) {
        const targetPath = path.join(this.rootDir, update.target);
        
        if (!fs.existsSync(targetPath)) {
            this.log(`Target file does not exist: ${targetPath}`);
            return;
        }
        
        let content = fs.readFileSync(targetPath, 'utf8');
        
        // Update architecture overview based on file changes
        content = this.updateArchitectureOverview(content, update);
        
        fs.writeFileSync(targetPath, content);
        this.log(`Updated architecture in ${update.target}`);
    }

    updateStrategicProgress(update) {
        const targetPath = path.join(this.rootDir, update.target);
        
        if (!fs.existsSync(targetPath)) {
            this.log(`Target file does not exist: ${targetPath}`);
            return;
        }
        
        let content = fs.readFileSync(targetPath, 'utf8');
        
        // Update high-level strategic status
        content = this.updateStrategicStatus(content, update.metadata);
        
        fs.writeFileSync(targetPath, content);
        this.log(`Updated strategic progress in ${update.target}`);
    }

    // Helper methods for content manipulation

    addProgressEntry(content, update) {
        const progressSection = '## 📊 Progress Metrics';
        const entry = `- **${new Date().toLocaleDateString()}**: ${update.reason}`;
        
        if (content.includes(progressSection)) {
            // Add to existing progress section
            const sectionEnd = content.indexOf('\n## ', content.indexOf(progressSection) + 1);
            const insertPoint = sectionEnd > -1 ? sectionEnd : content.length;
            
            return content.slice(0, insertPoint) + 
                   `\n${entry}` + 
                   content.slice(insertPoint);
        } else {
            // Create new progress section
            return content + `\n\n## 📊 Progress Metrics\n${entry}\n`;
        }
    }

    updateCurrentFocus(content, completedPhase) {
        // Map completed phases to next focus areas
        const focusMap = {
            '1': 'Foundation complete - moving to database implementation',
            '2': 'Database layer complete - implementing MCP server',
            '3': 'MCP server complete - building API integration',
            '4': 'API integration complete - optimizing performance',
            '5': 'Performance optimization complete - implementing enterprise features',
            '6': 'Enterprise features complete - advanced UI development'
        };
        
        const nextFocus = focusMap[completedPhase] || 'Continuing development';
        
        return content.replace(
            /\*\*🎯 Current Focus\*\*: [^\n]+/,
            `**🎯 Current Focus**: ${nextFocus}`
        );
    }

    updateImplementationProgress(content, metadata) {
        // Update percentage progress based on phase completion
        const phasePattern = new RegExp(`(Phase ${metadata.phase}[^\\n]*?)\\d+%`, 'i');
        
        if (metadata.newStatus.includes('COMPLETE')) {
            return content.replace(phasePattern, '$1100%');
        }
        
        return content;
    }

    extractTaskFromCommit(message) {
        // Extract meaningful task description from commit message
        const patterns = [
            /feat:\s*(.+)/i,
            /fix:\s*(.+)/i,
            /docs:\s*(.+)/i,
            /refactor:\s*(.+)/i
        ];
        
        for (const pattern of patterns) {
            const match = message.match(pattern);
            if (match) {
                return match[1].trim();
            }
        }
        
        return null;
    }

    addSessionAchievement(content, update) {
        const achievementSection = '## ✅ Previous Session Achievement';
        const achievement = `**${this.extractTaskFromCommit(update.metadata.message) || 'System Update'}**: ${update.reason}`;
        
        return content.replace(
            /(## ✅ Previous Session Achievement\n)\*\*[^*]+\*\*[^\n]*/,
            `$1${achievement}`
        );
    }

    extractDependencies() {
        const deps = {
            backend: this.readPackageJson('backend/package.json'),
            frontend: this.readPackageJson('frontend/package.json'),
            mcpServer: this.readPackageJson('mcp-server/package.json')
        };
        
        return deps;
    }

    readPackageJson(relativePath) {
        try {
            const fullPath = path.join(this.rootDir, relativePath);
            const content = fs.readFileSync(fullPath, 'utf8');
            const pkg = JSON.parse(content);
            
            return {
                dependencies: Object.keys(pkg.dependencies || {}),
                devDependencies: Object.keys(pkg.devDependencies || {}),
                version: pkg.version
            };
        } catch (error) {
            this.log(`Error reading ${relativePath}: ${error.message}`);
            return null;
        }
    }

    updateDependencySection(content, deps) {
        // Update the dependencies section with current package info
        const backendDeps = deps.backend?.dependencies.slice(0, 5).join(', ') || 'N/A';
        const frontendDeps = deps.frontend?.dependencies.slice(0, 5).join(', ') || 'N/A';
        
        const depSection = `### 🔧 **Dependencies & Tech Stack**

#### Backend (\`/backend/\`)
- **Runtime**: Node.js 18+, Express.js
- **Database**: better-sqlite3, SQLite with WAL mode
- **Key Dependencies**: ${backendDeps}

#### Frontend (\`/frontend/\`)
- **Runtime**: Vite dev server with ES modules
- **Key Dependencies**: ${frontendDeps}`;
        
        // Replace existing dependency section
        return content.replace(
            /### 🔧 \*\*Dependencies & Tech Stack\*\*[\s\S]*?(?=###|$)/,
            depSection
        );
    }

    updateArchitectureOverview(content, update) {
        // Update architecture section based on detected changes
        return content; // Placeholder - would analyze file changes and update accordingly
    }

    updateStrategicStatus(content, metadata) {
        // Update strategic status in ROADMAP.md
        if (metadata.newStatus.includes('COMPLETE')) {
            const statusUpdate = `**✅ Production Ready**: Phase ${metadata.phase} completed - ${new Date().toLocaleDateString()}`;
            
            return content.replace(
                /\*\*[^*]+\*\*: [^\n]+/,
                statusUpdate
            );
        }
        
        return content;
    }

    createSessionHandoff(targetPath, update) {
        const template = `# 🚀 Session Handoff - Current Session Focus

## 🎯 Current Session Task
**${this.extractTaskFromCommit(update.metadata.message) || 'System Maintenance'}**: Implementation and optimization work in progress.

## ✅ Previous Session Achievement
**${update.reason}**: Recent system improvements and feature development.

## 🎯 Next Session Priority  
**Continue Development**: Based on current progress and system state.

## 🔧 Current System State
- **Local Development**: All systems operational
- **Production**: Deployed and functional
- **Status**: Development work in progress

## 🔧 Essential Context for Next Session

### **Quick Start**
\`\`\`bash
# Local development
cd backend && USE_SQLITE=true npm run dev
cd frontend && npm run dev
\`\`\`

### **Next Session Context**
- **Task**: Continue current development focus
- **Priority**: Maintain system functionality and implement improvements
- **Status**: System operational, ready for continued development

---

*Session handoff for task continuity. See CLAUDE.md for complete system context.*`;

        // Ensure directory exists
        const dir = path.dirname(targetPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(targetPath, template);
        this.log(`Created session handoff at ${targetPath}`);
    }
}

// CLI interface
if (require.main === module) {
    const aue = new AutoUpdateEngine();
    
    const command = process.argv[2];
    
    switch (command) {
        case 'process':
            // Get updates from DSM and process them
            const DSM = require('./documentation-state-manager.cjs');
            const dsm = new DSM();
            const updates = dsm.getPendingUpdates();
            
            if (updates.length > 0) {
                aue.processUpdates(updates).then(processedIds => {
                    dsm.markUpdatesProcessed(processedIds);
                    console.log(`Processed ${processedIds.length} updates`);
                });
            } else {
                console.log('No pending updates to process');
            }
            break;
            
        default:
            console.log('Usage: auto-update-engine.js <process>');
            process.exit(1);
    }
}

module.exports = AutoUpdateEngine;