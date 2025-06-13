#!/usr/bin/env node

// Reset script to clear all local development storage
// This helps when transitioning between schema versions or architectures

const fs = require('fs');
const path = require('path');

console.log('🧹 Clearing all local development storage...');

// Clear Wrangler state (Cloudflare Workers local dev)
const wranglerState = path.join(__dirname, 'packages/docworker/.wrangler/state');
if (fs.existsSync(wranglerState)) {
  fs.rmSync(wranglerState, { recursive: true, force: true });
  console.log('✅ Cleared Wrangler state');
}

// Clear kernel temporary storage
const kernelTmp = path.join(__dirname, 'packages/dev-server-kernel-ls-client/tmp');
if (fs.existsSync(kernelTmp)) {
  fs.rmSync(kernelTmp, { recursive: true, force: true });
  console.log('✅ Cleared kernel temporary storage');
}

// Clear any other .db files in the project (except node_modules)
function clearDbFiles(dir) {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.name === 'node_modules') continue;

    if (entry.isDirectory()) {
      clearDbFiles(fullPath);
    } else if (entry.name.endsWith('.db') || entry.name.endsWith('.sqlite') || entry.name.includes('.db-')) {
      fs.unlinkSync(fullPath);
      console.log(`✅ Removed ${fullPath}`);
    }
  }
}

clearDbFiles(__dirname);

console.log('');
console.log('🎉 Local storage cleared!');
console.log('');
console.log('📝 Note: Web client OPFS storage will be cleared automatically');
console.log('   when you visit the app with ?reset=true parameter, or use');
console.log('   browser dev tools to clear site data.');
console.log('');
console.log('🚀 You can now start fresh with the new architecture:');
console.log('   pnpm dev');
