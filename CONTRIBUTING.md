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

Your development environment requires a couple of configuration files for the frontend (Vite) and the backend (Wrangler/Miniflare). You can create these by copying the provided example files.

- **For the backend Worker:**

  ```bash
  cp .dev.vars.example .dev.vars
  ```

  This file provides local secrets and variables to your Worker. The default values are suitable for getting started.

- **For the frontend application:**
  ```bash
  cp .env.example .env.development
  ```
  This file provides environment variables to the Vite build process for local development. The default values point to your local backend services.

These `.dev.vars` and `.env.development` files are already in `.gitignore` and should **never** be committed to the repository.

### 4. Run the Development Server

Start the entire Anode application (both the React frontend and the Cloudflare Worker backend) with a single command:

```bash
pnpm dev
```

This will start the Vite development server. You can now access the Anode application in your browser at **`http://localhost:5173`**. The Vite plugin automatically runs your Worker code, so any API requests from the frontend will be handled by your local Worker.

### 5. Enable Python Execution

To run Python code cells, you need to start the separate Pyodide runtime agent.

1.  Open Anode in your browser (`http://localhost:5173`).
2.  Create a new notebook.
3.  Click the **Runtime** button in the notebook header to view the required startup command.
4.  Copy the command (it will look something like `NOTEBOOK_ID=notebook-xyz... pnpm dev:runtime`).
5.  Run that command in a **new terminal window**.

Your notebook is now connected to a Python runtime and can execute code cells.

## Deployment

We have streamlined deployment scripts for our different environments:

- **Preview**: `pnpm deploy:preview`
- **Production**: `pnpm deploy:production`

**Note**: Before deploying, you must configure the required secrets (like `AUTH_TOKEN`, `GOOGLE_CLIENT_SECRET`, etc.) for the target environment using the `wrangler secret put` command. For example:

```bash
pnpm wrangler secret put AUTH_TOKEN --env preview
```

## Code Style and Conventions

We follow a consistent code style to keep the project maintainable.

- **TypeScript**: We use strict mode across the project.
- **Formatting**: We use Prettier for code formatting. Please run `pnpm format` before committing.
- **Linting**: We use ESLint to catch common errors. Run `pnpm lint` to check your code.
- **Architecture**: We prefer functional programming patterns (using the Effect library) and an event-sourced architecture via LiveStore.

## Submitting a Contribution

1.  Create a new branch for your feature or bugfix: `git checkout -b feature/my-awesome-feature`.
2.  Make your changes and add tests where appropriate.
3.  Ensure all checks pass by running `pnpm check`.
4.  Commit your changes with a clear and descriptive message.
5.  Push your branch and open a Pull Request against the `main` branch.

We appreciate your contributions and will review your PR as soon as possible!
