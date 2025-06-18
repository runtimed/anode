# JSR Schema Development Workflow

This guide explains how to work with the JSR-published schema in the Anode project.

## Overview

The Anode schema is published to JSR (JavaScript Registry) to enable clean sharing between:
- The main Node.js monorepo (web client, doc worker, tests)
- External Deno-based runtimes (pyodide-runtime-agent)

This eliminates LSP conflicts when mixing TypeScript, Node.js, and Deno in the same repository.

## Architecture

```
anode/
├── shared/schema.ts              # Source of truth (monorepo use)
├── packages/schema-jsr/          # JSR package preparation
│   ├── schema.ts                 # Copy of shared/schema.ts
│   ├── deno.json                 # JSR package config
│   └── README.md                 # JSR package docs
└── scripts/publish-schema.mjs    # Publishing automation
```

## For Contributors: Schema Changes

### 1. Make Changes in `shared/schema.ts`

Always edit the source file, never edit the JSR copy directly:

```typescript
// Edit this file ✅
anode/shared/schema.ts

// Don't edit this ❌
anode/packages/schema-jsr/schema.ts
```

### 2. Test Locally First

Test your schema changes with the existing monorepo:

```bash
# Run tests to verify schema changes work
pnpm test:schema
pnpm test:integration

# Type check all packages
pnpm type-check
```

### 3. Publish to JSR

When your schema changes are ready:

```bash
# Automatic publish (recommended)
pnpm publish:schema

# Force publish even if no changes detected
pnpm publish:schema:force
```

The publish script will:
- Copy latest schema to JSR package
- Auto-increment version number
- Publish to JSR registry
- Commit the version bump

### 4. Update External Consumers

After publishing, update any external Deno projects:

```typescript
// Update import version in your Deno runtime
import { schema, tables, events } from "jsr:@anode/schema@0.1.5";
```

## For External Projects: Using the Schema

### Deno Projects

```typescript
import { schema, tables, events } from "jsr:@anode/schema";

// Or with specific version
import { schema } from "jsr:@anode/schema@^0.1.0";
```

**Note**: Currently requires `--allow-slow-types` flag due to LiveStore's complex type exports. See [livestorejs/livestore#383](https://github.com/livestorejs/livestore/issues/383) for status.

### Node.js Projects (with pnpm 10.9+)

```bash
pnpm add jsr:@anode/schema
```

```typescript
import { schema, tables, events } from "@anode/schema";
```

## Development Workflow

### Local Development

For rapid iteration during development:

1. **Schema changes**: Edit `shared/schema.ts`
2. **Local testing**: Use monorepo packages (they import directly)
3. **External testing**: Publish to JSR when ready to test external integrations

### CI/CD Integration

The JSR publishing can be integrated into CI:

```yaml
# Example GitHub Action
- name: Publish Schema to JSR
  if: contains(github.event.head_commit.modified, 'shared/schema.ts')
  run: pnpm publish:schema
  env:
    DENO_DEPLOY_TOKEN: ${{ secrets.DENO_DEPLOY_TOKEN }}
```

**Note**: The publish script automatically uses `--allow-slow-types` to handle LiveStore's current JSR compatibility limitations.

## Versioning Strategy

- **Patch versions** (0.1.x): Non-breaking changes, bug fixes
- **Minor versions** (0.x.0): New features, backward-compatible changes  
- **Major versions** (x.0.0): Breaking changes

The publish script auto-increments patch versions. For minor/major versions:

```bash
# Edit packages/schema-jsr/deno.json manually before publishing
{
  "version": "0.2.0"  # Set desired version
}
```

## Breaking Changes

When making breaking schema changes:

1. **Plan the migration**: Document what changes and why
2. **Version bump**: Use major version increment
3. **Update dependents**: Coordinate updates to external projects
4. **Deprecation period**: Consider supporting old version temporarily

## Troubleshooting

### "Schema unchanged" Message

If you see this but want to publish anyway:

```bash
pnpm publish:schema:force
```

### JSR Publish Failures

Common issues:
- **Authentication**: Ensure `deno login` is configured
- **Network**: Check internet connection
- **Permissions**: Verify JSR organization access
- **Slow Types Warning**: Expected due to LiveStore complexity - automatically handled with `--allow-slow-types`

### Version Conflicts

If version conflicts occur:
- Check `packages/schema-jsr/deno.json` for correct version
- Ensure no unpublished local changes
- Use `--force` flag if needed

## Best Practices

### Schema Design
- **Backward compatibility**: Avoid breaking changes when possible
- **Optional fields**: Use nullable columns for new fields
- **Migration events**: Add events for schema migrations if needed

### Development
- **Test first**: Always test schema changes locally
- **Small changes**: Prefer smaller, incremental schema updates
- **Documentation**: Update JSR README when adding major features

### Publishing
- **Clean state**: Publish from clean git working directory
- **Test after publish**: Verify external projects work with new version
- **Tag releases**: Consider git tags for major schema versions

## FAQ

**Q: Why not use npm for schema sharing?**
A: JSR provides better TypeScript support and is designed for modern JS/TS modules. It's also Deno's preferred registry.

**Q: Can I use the schema in non-Deno, non-Node projects?**
A: Yes! JSR packages work in browsers and any modern JavaScript runtime.

**Q: What does the "slow types" warning mean?**
A: LiveStore's complex type exports require JSR's `--allow-slow-types` flag. This means slightly slower TypeScript performance and no automatic `.d.ts` generation for Node.js, but full functionality is preserved. See [livestorejs/livestore#383](https://github.com/livestorejs/livestore/issues/383).

**Q: What if JSR is down?**
A: The monorepo continues working normally since it uses the local schema. Only external projects are affected.

**Q: How do I revert a bad schema publish?**
A: You can't unpublish from JSR, but you can publish a fixed version immediately and update dependents.