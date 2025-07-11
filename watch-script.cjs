const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const pm2 = require("pm2");

const WATCH_FILE = "../runt/packages/schema/mod.ts";
const ABSOLUTE_WATCH_PATH = path.resolve(__dirname, WATCH_FILE);

console.log(`Watching for changes in: ${ABSOLUTE_WATCH_PATH}`);

// Function to run the required commands
async function runUpdateCommands() {
  console.log("🔄 File changed! Running update commands...");

  try {
    // Remove vite cache
    // console.log("🗑️  Removing vite cache...");
    // await execCommand("rm -rf node_modules/.vite");

    // Install schema package
    console.log("📦 Installing schema package...");
    await execCommand("pnpm install @runt/schema@file:../runt/packages/schema");

    // Restart PM2 processes
    console.log("🔄 Restarting development processes...");
    // await restartPM2Processes();
    // await execCommand("pm2 restart anode-sync");
    await execCommand("pm2 restart anode-dev");

    console.log("✅ Update completed successfully!");
  } catch (error) {
    console.error("❌ Error during update:", error);
  }
}

// Helper function to execute shell commands
function execCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, { cwd: __dirname }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing command: ${command}`, error);
        reject(error);
        return;
      }
      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);
      resolve();
    });
  });
}

// Function to restart PM2 processes
function restartPM2Processes() {
  return new Promise((resolve, reject) => {
    pm2.restart(["anode-dev", "anode-sync"], (error) => {
      if (error) {
        console.error("Error restarting PM2 processes:", error);
        reject(error);
        return;
      }
      console.log("✅ PM2 processes restarted successfully");
      resolve();
    });
  });
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
