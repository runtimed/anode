# Schema Package Publishing

This document explains how to publish the `@runtimed/schema` package to both npm and JSR.

## Overview

The `@runtimed/schema` package is published to two registries:

- **npm**: https://www.npmjs.com/package/@runtimed/schema
- **JSR**: https://jsr.io/@runtimed/schema

Both registries are kept in sync with matching version numbers.

## Prerequisites

### For Automated Publishing (GitHub Actions)

1. **NPM_TOKEN**: npm access token with publish permissions
   - Generate at: https://www.npmjs.com/settings/tokens
   - Add to GitHub repository secrets

2. **JSR_TOKEN**: JSR access token with publish permissions
   - Generate at: https://jsr.io/account/tokens
   - Add to GitHub repository secrets

### For Manual Publishing

1. **npm**: Authenticated with `npm login`
2. **JSR**: JSR CLI installed (`npm install -g jsr`)

## Automated Publishing (Recommended)

Publishing is automated via GitHub Actions when you push a git tag:

### 1. Update Version

Use the provided script to update both `package.json` and `jsr.json`:

```bash
# Bump to a new version (e.g., 0.1.3)
pnpm bump-schema 0.1.3
```

This script:

- Updates version in both `package.json` and `jsr.json`
- Validates version format
- Stages changes for git commit

### 2. Test Locally

Before publishing, test that everything works:

```bash
pnpm test-publish
```

This runs:

- Version consistency check
- Type checking
- Linting
- Format checking
- Dry run publishing to both registries

### 3. Commit and Tag

```bash
git commit -m "Bump schema version to v0.1.3"
git tag v0.1.3
git push origin HEAD --tags
```

### 4. GitHub Actions Takes Over

The workflow (`.github/workflows/publish.yml`) automatically:

1. Validates version consistency
2. Runs all checks (type, lint, format)
3. Tests dry run publishing
4. Publishes to npm
5. Publishes to JSR
6. Creates GitHub release

## Manual Publishing

If you need to publish manually:

### 1. Prepare and Test

```bash
# Update versions
pnpm bump-schema 0.1.3

# Test everything
pnpm test-publish
```

### 2. Publish to npm

```bash
pnpm --filter schema publish --access public --no-git-checks
```

### 3. Publish to JSR

```bash
pnpm --filter schema exec jsr publish --allow-slow-types
```

## Workflow Details

### Version Management

- Both `package.json` and `jsr.json` must have matching version numbers
- Use semantic versioning (e.g., `0.1.3`, `1.0.0`, `2.1.0-beta.1`)
- The `bump-schema` script ensures consistency

### Validation Steps

The publishing process includes several validation steps:

1. **Version Consistency**: Both files have matching versions
2. **Tag Validation**: Git tag matches package version
3. **Type Check**: TypeScript compilation without errors
4. **Lint Check**: ESLint passes with no warnings
5. **Format Check**: Prettier formatting is correct
6. **Publish Dry Run**: Both registries accept the package

### Publishing Strategy

- **Tags trigger publishing**: Only git tags starting with `v` trigger the workflow
- **Both registries**: Package is published to npm and JSR simultaneously
- **Failure handling**: If either registry fails, the workflow stops
- **GitHub Release**: Automatically created with links to both registries

## Troubleshooting

### Version Mismatch

```bash
❌ Version mismatch: package.json (0.1.2) != jsr.json (0.1.1)
```

**Solution**: Use `pnpm bump-schema <version>` to sync versions.

### JSR Slow Types Warning

```
Warning Publishing a library with slow types is not recommended.
```

This is expected. The schema package uses complex TypeScript types that JSR considers "slow types". We use `--allow-slow-types` to publish anyway.

### npm Authentication

```bash
npm error code ENEEDAUTH
```

**Solution**: Run `npm login` or ensure `NPM_TOKEN` is set correctly.

### JSR Authentication

```bash
error: Unauthorized
```

**Solution**: Ensure `JSR_TOKEN` is set correctly in GitHub secrets or run `jsr auth` for manual publishing.

### Git Tag Issues

```bash
❌ Tag version (0.1.3) doesn't match package version (0.1.2)
```

**Solution**: Ensure you've committed the version bump before tagging, or update the tag to match the package version.

## Scripts Reference

| Script       | Command                                                    | Purpose                               |
| ------------ | ---------------------------------------------------------- | ------------------------------------- |
| Version Bump | `pnpm bump-schema <version>`                               | Update package versions consistently  |
| Test Publish | `pnpm test-publish`                                        | Validate everything before publishing |
| Manual npm   | `pnpm --filter schema publish --access public`             | Publish to npm only                   |
| Manual JSR   | `pnpm --filter schema exec jsr publish --allow-slow-types` | Publish to JSR only                   |

## Package Structure

```
packages/schema/
├── package.json      # npm package configuration
├── jsr.json         # JSR package configuration
├── README.md        # Package documentation
├── src/
│   ├── index.ts     # Main export
│   ├── tables.ts    # Database schema
│   ├── types.ts     # TypeScript types
│   └── queries/     # Query helpers
└── tsconfig.json    # TypeScript configuration
```

## Release Checklist

- [ ] Version numbers match in `package.json` and `jsr.json`
- [ ] `pnpm test-publish` passes all checks
- [ ] Changes committed to git
- [ ] Git tag created and pushed
- [ ] GitHub Actions workflow completes successfully
- [ ] Both npm and JSR packages are live
- [ ] GitHub release is created

## Support

For issues with the publishing process:

1. Check GitHub Actions logs for detailed error messages
2. Test locally with `pnpm test-publish`
3. Verify authentication tokens are valid
4. Ensure version numbers are consistent
