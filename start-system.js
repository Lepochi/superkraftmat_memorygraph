#!/usr/bin/env node

/**
 * Unified startup script for Superkraftmat Memory System
 * Handles process cleanup and coordinated startup
 */

const { spawn } = require('child_process');
const path = require('path');
const readline = require('readline');
const { 
  cleanupZombies, 
  killPort, 
  savePid, 
  readPid,
  listProcesses 
} = require('./scripts/process-manager');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  red: '\x1b[31m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// ASCII banner
function showBanner() {
  console.clear();
  log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║     🧠 Superkraftmat Memory System                           ║
║     Knowledge Graph for AI Applications                       ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`, colors.blue);
}

// Wait for a port to be free
async function waitForPortFree(port, timeout = 5000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      await killPort(port);
      return true;
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return false;
}

// Start a service with enhanced error handling
async function startService(name, command, cwd, port) {
  log(`\n🚀 Starting ${name}...`, colors.yellow);
  
  // Ensure port is free
  const portFree = await waitForPortFree(port);
  if (!portFree) {
    log(`❌ Failed to free port ${port} for ${name}`, colors.red);
    return null;
  }

  return new Promise((resolve) => {
    const [cmd, ...args] = command.split(' ');
    const child = spawn(cmd, args, {
      cwd,
      env: { ...process.env, FORCE_COLOR: '1' },
      shell: true
    });

    let started = false;
    let errorBuffer = '';

    // Save PID
    if (child.pid) {
      savePid(name.toLowerCase().replace(' ', '-'), child.pid);
    }

    // Handle stdout
    child.stdout.on('data', (data) => {
      const output = data.toString();
      
      // Prefix output with service name
      output.split('\n').forEach(line => {
        if (line.trim()) {
          console.log(`[${name}] ${line}`);
        }
      });

      // Check if service started successfully
      if (!started) {
        if (output.includes('running on') || output.includes('ready') || output.includes('Local:')) {
          started = true;
          log(`✅ ${name} started successfully!`, colors.green);
          resolve(child);
        }
      }
    });

    // Handle stderr
    child.stderr.on('data', (data) => {
      const error = data.toString();
      errorBuffer += error;
      
      // Prefix errors
      error.split('\n').forEach(line => {
        if (line.trim()) {
          console.error(`[${name}] ${colors.red}ERROR: ${line}${colors.reset}`);
        }
      });
    });

    // Handle exit
    child.on('exit', (code, signal) => {
      if (!started) {
        log(`❌ ${name} failed to start`, colors.red);
        if (errorBuffer) {
          console.error(errorBuffer);
        }
        resolve(null);
      } else {
        log(`${name} exited with code ${code}`, colors.yellow);
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!started) {
        log(`⏱️  ${name} startup timeout`, colors.red);
        child.kill();
        resolve(null);
      }
    }, 30000);
  });
}

// Interactive menu
async function showMenu() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

  console.log(`
${colors.bright}What would you like to do?${colors.reset}

1) Start all services
2) Start backend only
3) Start frontend only
4) Clean up zombie processes
5) Show process status
6) Exit

`);

  const choice = await question('Enter your choice (1-6): ');
  rl.close();

  return choice.trim();
}

// Main startup sequence
async function main() {
  showBanner();

  // Check if running with command line arguments
  const arg = process.argv[2];
  let choice;

  if (arg) {
    const argMap = {
      'all': '1',
      'backend': '2',
      'frontend': '3',
      'cleanup': '4',
      'status': '5'
    };
    choice = argMap[arg] || arg;
  } else {
    choice = await showMenu();
  }

  switch (choice) {
    case '1':
      log('\n🧹 Cleaning up existing processes...', colors.yellow);
      await cleanupZombies();
      
      log('\n🚀 Starting all services...', colors.bright);
      
      // Start backend first
      const backend = await startService(
        'Backend',
        'npm run dev',
        path.join(__dirname, 'backend'),
        8000
      );

      if (backend) {
        // Wait a bit for backend to be fully ready
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Start frontend
        const frontend = await startService(
          'Frontend',
          'npm run dev',
          path.join(__dirname, 'frontend'),
          5173
        );

        if (frontend) {
          log('\n✨ All services started successfully!', colors.green);
          log('\nAccess the application at: http://localhost:5173\n', colors.bright);
          
          // Keep the process running
          process.stdin.resume();
          
          // Handle graceful shutdown
          process.on('SIGINT', async () => {
            log('\n\n🛑 Shutting down services...', colors.yellow);
            backend.kill();
            frontend.kill();
            await cleanupZombies();
            process.exit(0);
          });
        } else {
          backend.kill();
          log('\n❌ Failed to start frontend', colors.red);
          process.exit(1);
        }
      } else {
        log('\n❌ Failed to start backend', colors.red);
        process.exit(1);
      }
      break;

    case '2':
      log('\n🧹 Cleaning up existing backend processes...', colors.yellow);
      await killPort(8000);
      
      const backendOnly = await startService(
        'Backend',
        'npm run dev',
        path.join(__dirname, 'backend'),
        8000
      );
      
      if (backendOnly) {
        log('\n✨ Backend started successfully!', colors.green);
        log('API available at: http://localhost:8000\n', colors.bright);
        process.stdin.resume();
      }
      break;

    case '3':
      log('\n🧹 Cleaning up existing frontend processes...', colors.yellow);
      await killPort(5173);
      
      const frontendOnly = await startService(
        'Frontend',
        'npm run dev',
        path.join(__dirname, 'frontend'),
        5173
      );
      
      if (frontendOnly) {
        log('\n✨ Frontend started successfully!', colors.green);
        log('Access at: http://localhost:5173\n', colors.bright);
        process.stdin.resume();
      }
      break;

    case '4':
      await cleanupZombies();
      break;

    case '5':
      await listProcesses();
      break;

    case '6':
      log('Goodbye! 👋', colors.blue);
      process.exit(0);
      break;

    default:
      log('Invalid choice. Please try again.', colors.red);
      if (!arg) {
        main();
      }
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    log(`\n❌ Fatal error: ${error.message}`, colors.red);
    console.error(error);
    process.exit(1);
  });
}

module.exports = { main };