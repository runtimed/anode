# HANDOFF: Simplify Repository Structure

This document provides step-by-step instructions for the next engineer to simplify the anode repository from a complex monorepo structure to a clean, single-application setup.

## Background

The anode project currently has a complex pnpm workspace structure with multiple packages:
- `packages/web-client/` - React web application  
- `packages/docworker/` - Cloudflare Worker sync backend
- `packages/pyodide-runtime-agent/` - Python runtime (being moved to separate runt repo)

We want to simplify this to a single application with:
- Root-level Vite setup for the web client
- Root-level Wrangler setup for the sync worker
- Single `.env` file at repository root
- No package management complexity

## Step 1: Create a new branch

```bash
git checkout main
git pull origin main
git checkout -b simplify-repo-structure
```

## Step 2: Remove the pyodide-runtime-agent

The pyodide runtime agent has been moved to the separate `runt` repository and is no longer needed here.

```bash
# Remove the entire pyodide-runtime-agent package
git rm -r packages/pyodide-runtime-agent/

# Remove references from workspace configuration
git rm pnpm-workspace.yaml

# Remove root package.json workspace configuration
# (will be replaced with simple app package.json in later steps)
```

## Step 3: Restructure the web client

Move the web client from `packages/web-client/` to the repository root:

```bash
# Move web client files to root
mv packages/web-client/src ./src
mv packages/web-client/public ./public
mv packages/web-client/index.html ./index.html
mv packages/web-client/vite.config.ts ./vite.config.ts
mv packages/web-client/tsconfig.json ./tsconfig.json

# Merge package.json files (manual step - see notes below)
# Move and merge .env files (manual step - see notes below)
```

**Manual steps for package.json:**
- Take `packages/web-client/package.json` as the base
- Add any useful scripts from the root `package.json`
- Remove workspace-related configuration
- Update dependencies as needed
- Save as root `./package.json`

**Manual steps for environment:**
- Merge `packages/web-client/.env.example` with root `.env.example`
- Create single `.env` file at root with all necessary variables
- Update documentation to reference single `.env` location

## Step 4: Restructure the sync worker

The docworker is just a single `src/index.ts` file. Move it to be part of the main application:

```bash
# Create sync directory in main src
mkdir -p src/sync

# Move the worker file and rename it
mv packages/docworker/src/index.ts src/sync/sync.ts

# Move wrangler configuration to root
mv packages/docworker/wrangler.toml ./wrangler.toml

# Update wrangler.toml main entry point to: src/sync/sync.ts
```

**Manual steps for wrangler.toml:**
- Update `main = "src/sync/sync.ts"`
- Verify environment variable configurations
- Ensure compatibility options are preserved

## Step 5: Clean up workspace files

Remove all workspace-related files:

```bash
# Remove package directories (should be empty now)
git rm -r packages/

# Remove workspace configurations
rm -f pnpm-lock.yaml  # Will be regenerated for single package
```

## Step 6: Update build and development scripts

Update the root `package.json` scripts to handle both web and worker development:

```json
{
  "scripts": {
    "dev": "vite",
    "dev:sync": "wrangler dev",
    "build": "vite build",
    "build:sync": "wrangler deploy --dry-run",
    "deploy": "vite build && wrangler deploy",
    "preview": "vite preview",
    "test": "vitest",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "type-check": "tsc --noEmit"
  }
}
```

## Step 7: Update import paths

Since we're moving from packages to a single application, update import paths throughout the codebase:

- Change imports from `@anode/web-client` to relative paths
- Update any references to the package structure in documentation
- Ensure TypeScript path mapping works correctly

## Step 8: Update deployment configuration

**GitHub Actions (if applicable):**
- Update deployment workflows to use root-level commands
- Simplify build processes since there's no workspace complexity

**Cloudflare Pages:**
- Verify build command points to root Vite build
- Ensure environment variables are configured at project level

## Step 9: Update documentation

Update the following documentation files:

- `README.md` - Remove workspace complexity, simplify setup instructions
- `DEPLOYMENT.md` - Update with simplified build/deploy process  
- `CONTRIBUTING.md` - Remove package-specific development instructions
- Any other docs referencing the old structure

## Step 10: Test the new structure

```bash
# Install dependencies (single package now)
pnpm install

# Test web development
pnpm dev

# Test worker development (in separate terminal)
pnpm dev:sync

# Test builds
pnpm build
pnpm build:sync

# Run tests
pnpm test
```

## Step 11: Commit and test deployment

```bash
git add -A
git commit -m "Simplify repository structure to single application

- Remove pyodide-runtime-agent (moved to runt repo)
- Move web-client to repository root
- Move docworker to src/sync/sync.ts
- Single package.json and .env configuration
- Simplified development and build processes"

git push -u origin simplify-repo-structure
```

**Test deployment:**
- Create a test deployment to verify everything works
- Check that environment variables are properly configured
- Ensure both web app and sync worker deploy correctly

## Expected Benefits

After this restructuring:

1. **Simpler development** - Single `pnpm install`, single `.env` file
2. **Easier onboarding** - No workspace complexity to understand  
3. **Cleaner deployment** - Standard Vite + Wrangler setup
4. **Better DX** - Standard project structure that most developers expect
5. **Reduced maintenance** - No workspace configuration to maintain

## Potential Issues to Watch For

1. **Import path changes** - Make sure all relative imports work correctly
2. **TypeScript configuration** - Ensure paths resolve properly
3. **Environment variables** - Verify all required vars are in root `.env`
4. **Build processes** - Test that both web and worker builds work
5. **Deployment** - Ensure Cloudflare Pages/Workers deploy correctly

## Rollback Plan

If issues arise, the previous structure can be restored from git history:

```bash
git checkout main
git branch -D simplify-repo-structure
# Start over or investigate specific issues
```

## Final Notes

This transformation moves anode from a complex monorepo to a simple, standard web application structure. The separate `runt` repository now handles the Python runtime complexity, allowing anode to focus purely on the notebook interface and sync functionality.

The result should be a much more approachable codebase that follows standard conventions for a Vite + Cloudflare Workers application.