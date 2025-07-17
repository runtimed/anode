# Contributing to Anode

Thank you for your interest in contributing to Anode! This guide provides everything you need to get your development environment set up and start contributing.

## Core Philosophy

Anode is a real-time, collaborative notebook environment built on a modern, local-first stack. We prioritize a clean, maintainable codebase and a smooth developer experience. Our goal is to make it as easy as possible for you to contribute.

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (version 23.0.0 or higher)
- [Deno](https://docs.deno.com/runtime/getting_started/installation/) (version v2.4.1 or higher)
- [pnpm](https://pnpm.io/installation)
- [Git](https://git-scm.com/)

## Development Setup

Getting started with Anode is designed to be as simple as possible.

### 1. Clone the Repository

First, clone the Anode repository to your local machine:

```bash
git clone https://github.com/runtimed/anode.git
cd anode
```

### 2. Install Dependencies

Install all project dependencies using `pnpm`. This command will also set up all necessary tooling.

```bash
pnpm install
```

### 3. Configure Your Local Environment

You need to copy the environment configuration files manually:

```bash
# Copy environment configuration files
cp .env.example .env
cp .dev.vars.example .dev.vars
```

- **`.dev.vars`** - Local secrets and variables for the Worker
- **`.env`** - Environment variables for the Vite build process

These files are already in `.gitignore` and should **never** be committed to the repository.

**Note**: The example files contain sensible defaults that work for local development out of the box.

### 4. Run the Development Server

Start the entire Anode application (both the React frontend and the Cloudflare Worker backend) with a single command:

```bash
pnpm dev
```

This will start the integrated development server using the Vite Cloudflare plugin. You can now access the Anode application in your browser at **`http://localhost:5173`**. The unified server handles both frontend assets and backend API requests, providing a seamless development experience.

### 5. Enable Python Execution

To run Python code cells, you need to start the separate Pyodide runtime agent.

1.  Open Anode in your browser (`http://localhost:5173`).
2.  Create a new notebook.
3.  Click the **Runtime** button in the notebook header to view the required startup command.
4.  Copy the command (it will look something like `NOTEBOOK_ID=notebook-xyz... pnpm dev:runtime`).
5.  Run that command in a **new terminal window**.

Your notebook is now connected to a Python runtime and can execute code cells.

## Schema Linking for Development

The `@runt/schema` package provides shared types and events between Anode and Runt. The linking method depends on your development phase:

### Production (JSR Package)

```json
"@runt/schema": "jsr:^0.6.4"
```

Use this for stable releases and production deployments.

### Testing PR Changes (GitHub Reference)

```json
"@runt/schema": "github:runtimed/runt#1d52f9e51b9f28e81e366a7053d1e5fa6164c390&path:/packages/schema"
```

Use this when testing changes from a merged PR in the Runt repository. Replace the commit hash with the specific commit you want to test.

### Local Development (File Link)

```json
"@runt/schema": "file:../runt/packages/schema"
```

Use this when developing locally with both Anode and Runt repositories side-by-side.

### Switching Between Modes

1. **Update `package.json`** with the appropriate schema reference
2. **Run `pnpm install`** to update dependencies
3. **Restart your development server** (`pnpm dev`)

**Important**: Always ensure both repositories are using compatible schema versions. Type errors usually indicate schema mismatches.

## Deployment

We use a unified Cloudflare Worker architecture that serves both the web client and backend API. Deploy with:

- **Production**: `pnpm deploy:production`
- **Preview**: `pnpm deploy:preview`

The deployment process builds the web client and deploys the all-in-one worker to Cloudflare.

**Note**: Before deploying, you must configure the required secrets (like `AUTH_TOKEN`, `GOOGLE_CLIENT_SECRET`, etc.) for the target environment using the `wrangler secret put` command. For example:

```bash
pnpm wrangler secret put AUTH_TOKEN --env production
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## Code Style and Conventions

We follow a consistent code style to keep the project maintainable.

- **TypeScript**: We use strict mode across the project.
- **Formatting**: We use Prettier for code formatting. Please run `pnpm format` before committing.
- **Linting**: We use ESLint to catch common errors. Run `pnpm lint` to check your code.
- **Testing**: Run `pnpm test` to execute the test suite (60+ tests covering core functionality).
- **Architecture**: We prefer functional programming patterns (using the Effect library) and an event-sourced architecture via LiveStore.
- **Development stability**: The integrated dev server is stable with hot reload for most changes. .env file changes are ignored to prevent crashes.

## Submitting a Contribution

1.  Create a new branch for your feature or bugfix: `git checkout -b feature/my-awesome-feature`.
2.  Make your changes and add tests where appropriate.
3.  Ensure all checks pass by running `pnpm check`.
4.  Commit your changes with a clear and descriptive message.
5.  Push your branch and open a Pull Request against the `main` branch.

We appreciate your contributions and will review your PR as soon as possible!
