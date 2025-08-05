# IFrame Outputs - Vite Setup

This directory now uses Vite for development and building of the iframe content.

## Structure

```
iframe-outputs/
├── src/                    # Source files
│   ├── index.html         # Main HTML entry point
│   ├── main.ts            # TypeScript entry point
│   ├── style.css          # CSS styles
│   ├── tsconfig.json      # TypeScript config for src
│   └── tsconfig.node.json # TypeScript config for Node tools
├── vite.config.ts         # Vite configuration
├── package.json           # Dependencies and scripts
└── dist/                  # Built output (generated)
```

## Development

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Features

- **Hot Module Replacement**: Changes to TypeScript and CSS files are reflected immediately
- **TypeScript Support**: Full TypeScript compilation and type checking
- **CSS Processing**: CSS is processed and optimized
- **Production Builds**: Optimized builds with minification and bundling
- **Development Server**: Fast development server with live reload

## Integration with Cloudflare Workers

The original Cloudflare Workers setup is still available:

```bash
# Start Wrangler development server
pnpm wrangler:dev

# Deploy to Cloudflare
pnpm deploy
```

## Build Process

1. Vite processes the `src/` directory
2. TypeScript files are compiled
3. CSS is processed and optimized
4. All assets are bundled and optimized
5. Output is generated in the `dist/` directory

The built files can then be served by the Cloudflare Worker or any other static file server.
