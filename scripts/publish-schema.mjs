#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const schemaJsrDir = join(rootDir, 'packages', 'schema-jsr');
const sharedSchemaPath = join(rootDir, 'shared', 'schema.ts');

console.log('🚀 Publishing Anode schema to JSR...');

// Check if we're on a clean git state
try {
  const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
  if (gitStatus.trim() && !process.argv.includes('--force')) {
    console.error('❌ Git working directory is not clean. Commit or stash changes first.');
    console.error('   Or use --force to publish anyway.');
    process.exit(1);
  }
} catch (error) {
  console.warn('⚠️  Could not check git status:', error.message);
}

// Copy the latest schema
console.log('📋 Copying latest schema...');
copyFileSync(sharedSchemaPath, join(schemaJsrDir, 'schema.ts'));

// Check if schema has changed since last publish
try {
  const lastCommit = execSync('git log -1 --format="%H" -- shared/schema.ts', { encoding: 'utf8' }).trim();
  const lastPublishedCommit = execSync('git log -1 --format="%H" -- packages/schema-jsr/schema.ts', { encoding: 'utf8' }).trim();

  if (lastCommit === lastPublishedCommit && !process.argv.includes('--force')) {
    console.log('✅ Schema unchanged since last publish. Use --force to publish anyway.');
    process.exit(0);
  }
} catch (error) {
  console.log('📝 Cannot determine last published version, proceeding with publish...');
}

// Auto-increment version
const denoConfigPath = join(schemaJsrDir, 'deno.json');
const denoConfig = JSON.parse(readFileSync(denoConfigPath, 'utf8'));

const currentVersion = denoConfig.version;
const [major, minor, patch] = currentVersion.split('.').map(Number);

// Increment patch version
const newVersion = `${major}.${minor}.${patch + 1}`;
denoConfig.version = newVersion;

console.log(`📦 Bumping version: ${currentVersion} → ${newVersion}`);
writeFileSync(denoConfigPath, JSON.stringify(denoConfig, null, 2) + '\n');

// Publish to JSR
console.log('🚀 Publishing to JSR...');
try {
  const publishOutput = execSync('deno publish --allow-dirty', {
    cwd: schemaJsrDir,
    encoding: 'utf8',
    stdio: 'inherit'
  });

  console.log('✅ Successfully published to JSR!');
  console.log(`📦 Published version: ${newVersion}`);

  // Commit the version bump
  try {
    execSync(`git add ${denoConfigPath} ${join(schemaJsrDir, 'schema.ts')}`, { stdio: 'inherit' });
    execSync(`git commit -m "chore: publish schema v${newVersion} to JSR"`, { stdio: 'inherit' });
    console.log('✅ Committed version bump');
  } catch (error) {
    console.warn('⚠️  Could not commit version bump:', error.message);
  }

} catch (error) {
  console.error('❌ Failed to publish to JSR:', error.message);

  // Revert version bump on failure
  denoConfig.version = currentVersion;
  writeFileSync(denoConfigPath, JSON.stringify(denoConfig, null, 2) + '\n');
  console.log('🔄 Reverted version bump');

  process.exit(1);
}

console.log('');
console.log('🎉 Schema published successfully!');
console.log('');
console.log('Next steps:');
console.log('1. Update your Deno runtime to use the new version');
console.log('2. Test the integration');
console.log('3. Update documentation if needed');
console.log('');
console.log(`Install in Deno: import { schema } from "jsr:@anode/schema@${newVersion}";`);
console.log(`Install in Node: pnpm add jsr:@anode/schema@${newVersion}`);
