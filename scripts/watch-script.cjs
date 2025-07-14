const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

// Not using PM2 here because importing it doesn't work
// const pm2 = require("pm2");

const WATCH_FILE = "../../runt/packages/schema/mod.ts";
const ABSOLUTE_WATCH_PATH = path.resolve(__dirname, WATCH_FILE);
const PROJECT_ROOT = path.resolve(__dirname, "..");

console.log(`Watching for changes in: ${ABSOLUTE_WATCH_PATH}`);

// Function to run the required commands
async function runUpdateCommands() {
  console.log("🔄 File changed! Running update commands...");

  try {
    // Install schema package
    console.log("📦 Installing schema package...");
    await execCommand("pnpm install @runt/schema@file:../runt/packages/schema");

    // Remove vite cache
    console.log("🗑️  Removing vite cache...");
    await execCommand("rm -rf node_modules/.vite");

    // Restart PM2 processes
    console.log("🔄 Restarting development processes...");
    await execCommand("pm2 restart web");

    console.log("✅ Update completed successfully!");
  } catch (error) {
    console.error("❌ Error during update:", error);
  }
}

// Helper function to execute shell commands
function execCommand(command) {
  return new Promise((resolve, reject) => {
    // Use spawn for real-time output, especially for long-running processes
    const child = spawn(command, [], {
      cwd: PROJECT_ROOT,
      shell: true,
      stdio: ["inherit", "pipe", "pipe"],
    });

    child.stdout.on("data", (data) => {
      console.log(data.toString());
    });

    child.stderr.on("data", (data) => {
      console.error(data.toString());
    });

    child.on("error", (error) => {
      console.error(`Error executing command: ${command}`, error);
      reject(error);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        console.error(`Command exited with code ${code}`);
        reject(new Error(`Command exited with code ${code}`));
      } else {
        resolve();
      }
    });
  });
}

// Helper function to execute long-running commands (don't wait for completion)
function execCommandAsync(command) {
  const child = spawn(command, [], {
    cwd: PROJECT_ROOT,
    shell: true,
    stdio: ["inherit", "pipe", "pipe"],
  });

  child.stdout.on("data", (data) => {
    console.log(data.toString());
  });

  child.stderr.on("data", (data) => {
    console.error(data.toString());
  });

  child.on("error", (error) => {
    console.error(`Error executing command: ${command}`, error);
  });

  return child;
}

// Watch the file for changes
let lastModified = 0;

fs.watchFile(ABSOLUTE_WATCH_PATH, { interval: 1000 }, (curr, prev) => {
  // Only trigger if the file was actually modified (not just accessed)
  if (curr.mtime > lastModified) {
    lastModified = curr.mtime;
    console.log(`📝 File modified at ${new Date().toISOString()}`);
    runUpdateCommands();
  }
});

// Handle process termination
process.on("SIGINT", () => {
  console.log("🛑 File watcher stopped");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("🛑 File watcher stopped");
  process.exit(0);
});

console.log("👀 File watcher started. Press Ctrl+C to stop.");
