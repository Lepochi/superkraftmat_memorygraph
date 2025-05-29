#!/usr/bin/env node

/**
 * Process Manager for Superkraftmat Memory System
 * Handles cleanup of zombie processes and provides process management utilities
 */

const { exec, spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// Configuration
const CONFIG = {
  pidDir: path.join(__dirname, '../.pids'),
  ports: {
    backend: 8000,
    frontend: 5173
  },
  processNames: {
    backend: 'superkraft-backend',
    frontend: 'superkraft-frontend'
  }
};

// Ensure PID directory exists
async function ensurePidDir() {
  try {
    await fs.mkdir(CONFIG.pidDir, { recursive: true });
  } catch (error) {
    console.error('Failed to create PID directory:', error);
  }
}

// Get PID file path
function getPidFile(processName) {
  return path.join(CONFIG.pidDir, `${processName}.pid`);
}

// Save PID to file
async function savePid(processName, pid) {
  try {
    await ensurePidDir();
    await fs.writeFile(getPidFile(processName), pid.toString());
    console.log(`✅ Saved PID ${pid} for ${processName}`);
  } catch (error) {
    console.error(`Failed to save PID for ${processName}:`, error);
  }
}

// Read PID from file
async function readPid(processName) {
  try {
    const pidFile = getPidFile(processName);
    const pid = await fs.readFile(pidFile, 'utf8');
    return parseInt(pid.trim());
  } catch (error) {
    return null;
  }
}

// Remove PID file
async function removePid(processName) {
  try {
    await fs.unlink(getPidFile(processName));
  } catch (error) {
    // Ignore if file doesn't exist
  }
}

// Check if process is running
function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return false;
  }
}

// Kill process by PID
async function killProcess(pid, signal = 'SIGTERM') {
  return new Promise((resolve) => {
    try {
      process.kill(pid, signal);
      console.log(`🔪 Sent ${signal} to process ${pid}`);
      
      // Wait for process to die
      let attempts = 0;
      const checkInterval = setInterval(() => {
        if (!isProcessRunning(pid) || attempts > 10) {
          clearInterval(checkInterval);
          resolve(!isProcessRunning(pid));
        }
        attempts++;
      }, 200);
    } catch (error) {
      resolve(false);
    }
  });
}

// Kill processes on port
async function killPort(port) {
  return new Promise((resolve) => {
    const platform = os.platform();
    let command;

    if (platform === 'darwin' || platform === 'linux') {
      command = `lsof -ti :${port} | xargs kill -9 2>/dev/null || true`;
    } else if (platform === 'win32') {
      command = `FOR /F "tokens=5" %P IN ('netstat -ano ^| findstr :${port}') DO TaskKill /PID %P /F`;
    } else {
      console.error('Unsupported platform:', platform);
      resolve(false);
      return;
    }

    exec(command, (error) => {
      if (!error) {
        console.log(`✅ Killed processes on port ${port}`);
      }
      resolve(!error);
    });
  });
}

// Find processes by pattern
async function findProcesses(pattern) {
  return new Promise((resolve) => {
    const platform = os.platform();
    let command;

    if (platform === 'darwin' || platform === 'linux') {
      command = `ps aux | grep -E "${pattern}" | grep -v grep`;
    } else if (platform === 'win32') {
      command = `wmic process where "CommandLine like '%${pattern}%'" get ProcessId,CommandLine /format:csv`;
    } else {
      resolve([]);
      return;
    }

    exec(command, (error, stdout) => {
      if (error) {
        resolve([]);
        return;
      }

      const processes = [];
      const lines = stdout.trim().split('\n').filter(line => line);
      
      if (platform === 'darwin' || platform === 'linux') {
        lines.forEach(line => {
          const parts = line.split(/\s+/);
          if (parts.length >= 2) {
            processes.push({
              user: parts[0],
              pid: parseInt(parts[1]),
              command: parts.slice(10).join(' ')
            });
          }
        });
      }

      resolve(processes);
    });
  });
}

// Clean up all zombie processes
async function cleanupZombies() {
  console.log('🧹 Cleaning up zombie processes...\n');

  // Kill processes on our ports
  for (const [service, port] of Object.entries(CONFIG.ports)) {
    console.log(`Checking port ${port} (${service})...`);
    await killPort(port);
  }

  // Kill processes by saved PIDs
  for (const processName of Object.values(CONFIG.processNames)) {
    const pid = await readPid(processName);
    if (pid && isProcessRunning(pid)) {
      console.log(`Found ${processName} running with PID ${pid}`);
      const killed = await killProcess(pid);
      if (killed) {
        await removePid(processName);
      }
    }
  }

  // Find and kill any remaining node processes related to our project
  const patterns = ['nodemon.*server\\.js', 'vite', 'superkraft'];
  for (const pattern of patterns) {
    const processes = await findProcesses(pattern);
    for (const proc of processes) {
      console.log(`Found process: PID ${proc.pid} - ${proc.command.substring(0, 50)}...`);
      await killProcess(proc.pid, 'SIGKILL');
    }
  }

  console.log('\n✅ Cleanup complete!\n');
}

// List running processes
async function listProcesses() {
  console.log('📋 Current processes:\n');

  // Check saved PIDs
  for (const [service, processName] of Object.entries(CONFIG.processNames)) {
    const pid = await readPid(processName);
    if (pid && isProcessRunning(pid)) {
      console.log(`✅ ${service}: PID ${pid} (running)`);
    } else if (pid) {
      console.log(`❌ ${service}: PID ${pid} (not running - stale PID file)`);
      await removePid(processName);
    } else {
      console.log(`⚪ ${service}: not tracked`);
    }
  }

  // Check ports
  console.log('\nPort status:');
  for (const [service, port] of Object.entries(CONFIG.ports)) {
    const inUse = await isPortInUse(port);
    console.log(`${inUse ? '🔴' : '🟢'} Port ${port} (${service}): ${inUse ? 'in use' : 'free'}`);
  }
}

// Check if port is in use
async function isPortInUse(port) {
  return new Promise((resolve) => {
    const platform = os.platform();
    let command;

    if (platform === 'darwin' || platform === 'linux') {
      command = `lsof -i :${port}`;
    } else if (platform === 'win32') {
      command = `netstat -ano | findstr :${port}`;
    } else {
      resolve(false);
      return;
    }

    exec(command, (error) => {
      resolve(!error);
    });
  });
}

// Start a managed process
async function startProcess(service, command, cwd) {
  const processName = CONFIG.processNames[service];
  
  // Check if already running
  const existingPid = await readPid(processName);
  if (existingPid && isProcessRunning(existingPid)) {
    console.log(`⚠️  ${service} is already running (PID: ${existingPid})`);
    return;
  }

  // Clean up any processes on the port
  await killPort(CONFIG.ports[service]);

  console.log(`🚀 Starting ${service}...`);
  
  const [cmd, ...args] = command.split(' ');
  const child = spawn(cmd, args, {
    cwd: cwd || process.cwd(),
    stdio: 'inherit',
    shell: true
  });

  if (child.pid) {
    await savePid(processName, child.pid);
    console.log(`✅ ${service} started with PID ${child.pid}`);

    // Handle process exit
    child.on('exit', async (code, signal) => {
      console.log(`${service} exited with code ${code} and signal ${signal}`);
      await removePid(processName);
    });
  } else {
    console.error(`❌ Failed to start ${service}`);
  }
}

// CLI commands
const commands = {
  cleanup: cleanupZombies,
  list: listProcesses,
  'start-backend': () => startProcess('backend', 'npm run dev', path.join(__dirname, '../backend')),
  'start-frontend': () => startProcess('frontend', 'npm run dev', path.join(__dirname, '../frontend')),
  'stop-backend': async () => {
    const pid = await readPid(CONFIG.processNames.backend);
    if (pid) {
      await killProcess(pid);
      await removePid(CONFIG.processNames.backend);
    }
    await killPort(CONFIG.ports.backend);
  },
  'stop-frontend': async () => {
    const pid = await readPid(CONFIG.processNames.frontend);
    if (pid) {
      await killProcess(pid);
      await removePid(CONFIG.processNames.frontend);
    }
    await killPort(CONFIG.ports.frontend);
  },
  'stop-all': async () => {
    await commands['stop-backend']();
    await commands['stop-frontend']();
  }
};

// Main CLI
async function main() {
  const command = process.argv[2];

  if (!command || command === 'help') {
    console.log(`
Superkraftmat Memory System - Process Manager

Usage: node process-manager.js <command>

Commands:
  cleanup         - Kill all zombie processes and clean up
  list           - List current processes and their status
  start-backend  - Start the backend server
  start-frontend - Start the frontend dev server
  stop-backend   - Stop the backend server
  stop-frontend  - Stop the frontend dev server
  stop-all       - Stop all services
  help           - Show this help message

Examples:
  node scripts/process-manager.js cleanup
  node scripts/process-manager.js start-backend
`);
    return;
  }

  if (commands[command]) {
    await commands[command]();
  } else {
    console.error(`Unknown command: ${command}`);
    console.log('Run "node process-manager.js help" for usage information');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

// Export for use as module
module.exports = {
  cleanupZombies,
  killPort,
  killProcess,
  startProcess,
  listProcesses,
  savePid,
  readPid
};