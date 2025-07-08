# Deno Introduction

Deno is an alternative to Node.js, functioning as a command-line tool capable of installing packages and executing TypeScript or WebAssembly. It includes built-in development tools for linting, formatting, and testing, eliminating the need for manual configuration.

## Do I Need to Install Deno to Run Anode?

Not directly. The Anode repository is a traditional Node.js-based application, utilizing standard Node.js paradigms (with pnpm for package management). However, to execute Python code, Anode requires connection to a runtime agent. For example, the command `NOTEBOOK_ID=notebook-abc-123 deno run --allow-all --env-file=.env "jsr:@runt/pyodide-runtime-agent"` uses Deno for this purpose. While local development typically involves running the runtime agent with Deno on the same machine, it can also operate on a separate machine.

Deno is chosen for the runtime agent due to its superior WebAssembly support for asynchronous networking and other native features, which are essential for our Pyodide runtime.

## What Kinds of Files Can You Run with Deno?

Deno supports subsets of web standards (e.g., import statements), Promises, and async/await. Therefore, standard TypeScript packages will likely work out-of-the-box.

However, Deno does not natively run Node.js code. When writing a Deno-native package, source code transformations are often necessary. For instance, `import { promises as fs } from 'fs';` needs to be changed to use Deno's Node.js compatibility layer: `import * as fs from 'node:fs/promises';`.

Similarly, npm packages require a prefix. Instead of `import React from 'react'`, you would use `import React from 'npm:react'`. All imports in Deno are URLs (unless aliased), adhering to the JavaScript import specification. These specifiers can also be aliased or mapped in the `deno.json` import map, allowing for customized or simplified import paths.

## Permission Model

When starting the Deno runtime, you must explicitly specify the permissions the application is allowed to have (defaults to none). For example, `deno --allow-net` grants the program the ability to bind network sockets. Refer to the [Deno security documentation](https://docs.deno.com/runtime/fundamentals/security/) for a comprehensive understanding of this model.

## NPM, JSR, and Deno Land

These are all package repositories. JSR is a superset of npm, containing packages compatible with Node.js, Deno, Cloudflare Workers, and other runtimes. JSR is responsible for transpiling TypeScript-only packages to work with JavaScript-only runtimes (e.g., Node.js).

The distinction between deno.land and JSR lies in deno.land's function as a caching service for third-party URLs. For example, a package published to GitHub can be cached on deno.land. However, since deno.land does not maintain ownership, changes to the underlying host will affect deno.land. JSR, conversely, provides a more stable and owned registry.

Another notable feature of Deno's TypeScript understanding is the elimination of import bundling. You can directly `import React from https://esm.sh/react` (using built-in ECMAScript standards) to fetch packages remotely.

## Learn More

- [What is Deno](https://docs.deno.com/examples/what_is_deno/)
- [Video Tutorial series](https://www.youtube.com/watch?v=KPTOo4k8-GE&list=PLvvLnBDNuTEov9EBIp3MMfHlBxaKGRWTe&index=1)
- [Runt codebase](https://github.com/runtimed/runt)
