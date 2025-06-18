# @anode/schema

LiveStore schema definitions for Anode collaborative notebooks.

This package contains the shared schema that defines the data structure and events for Anode notebooks. It's designed to be consumed by both the main Anode monorepo (Node.js/TypeScript) and external runtimes (like Deno-based execution agents).

## Usage

### In Deno

```typescript
import { schema, tables, events } from "jsr:@anode/schema";
```

### In Node.js/pnpm projects

```bash
pnpm add jsr:@anode/schema
```

```typescript
import { schema, tables, events } from "@anode/schema";
```

## What's Included

- **`schema`**: Complete LiveStore schema for notebook stores
- **`tables`**: Database table definitions (notebook, cells, outputs, etc.)
- **`events`**: Event definitions for real-time collaboration
- **Type definitions**: Full TypeScript types for all data structures

## Architecture

This schema uses [LiveStore](https://docs.livestore.dev/) for event-sourcing and real-time collaboration:

- **Event-sourced**: All changes flow through events
- **Reactive**: Database queries update automatically
- **Collaborative**: Multiple users can edit simultaneously
- **Local-first**: Works offline, syncs when connected

## Key Data Types

- **Notebooks**: Metadata and configuration
- **Cells**: Code, markdown, and AI cells with execution state
- **Outputs**: Rich display data from cell execution
- **Execution Queue**: Async execution management
- **Kernel Sessions**: Runtime connection tracking

## Development

This package is automatically generated from the main Anode repository's shared schema. Changes should be made in the main repo and published here for external consumption.

## License

MIT