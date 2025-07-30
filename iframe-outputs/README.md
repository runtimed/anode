# Iframe Outputs Service

This service provides an isolated domain for rendering user-generated HTML and SVG content in iframes. It runs on `runtusercontent.com` to provide security isolation from the main application domain.

## Purpose

When users execute code that generates HTML or SVG outputs (like matplotlib plots or pandas dataframes), these outputs need to be rendered in an iframe for security isolation. This prevents user-generated content from accessing the main application's cookies, localStorage, or other sensitive data.

## Architecture

- **Separate Domain**: Runs on `runtusercontent.com` (and subdomains for different environments)
- **Cloudflare Worker**: Simple static file server with security headers
- **PostMessage API**: Communicates with parent window for dynamic content updates and height adjustments

## Deployment

### Prerequisites

1. DNS configured for `runtusercontent.com` pointing to Cloudflare
2. Cloudflare account with Workers enabled
3. `wrangler` CLI installed (comes with main project dependencies)

### Deploy to Production

```bash
cd iframe-outputs
pnpm deploy:production
```

This deploys to:

- Production: `https://runtusercontent.com`
- Preview: `https://preview.runtusercontent.com` (with `pnpm deploy:preview`)
- Staging: `https://staging.runtusercontent.com` (with `pnpm deploy:staging`)

### Local Development

```bash
cd iframe-outputs
pnpm dev
```

Runs locally on http://localhost:8000

## How It Works

1. **Main App**: When rendering HTML/SVG outputs, creates an iframe pointing to `VITE_IFRAME_OUTPUT_URI`
2. **Initial Load**: Iframe loads `index.html` which sets up PostMessage listeners
3. **Content Updates**: Main app sends content via PostMessage with `type: "update-content"`
4. **Height Management**: Iframe measures its content height and reports back via PostMessage
5. **Security**: Content is sandboxed with appropriate CSP headers and runs on a separate domain

## Security Headers

The worker sets the following security headers:

- `X-Content-Type-Options: nosniff` - Prevents MIME type sniffing
- `X-Frame-Options: ALLOWALL` - Allows embedding in iframes
- `Content-Security-Policy` - Restricts resource loading while allowing necessary features
- `Access-Control-Allow-Origin: *` - Enables cross-origin communication

## Files

- `index.html` - The iframe content handler with PostMessage API
- `worker.js` - Cloudflare Worker that serves the content with security headers
- `wrangler.toml` - Cloudflare Worker configuration
- `package.json` - Deployment scripts

## Environment Configuration

The main application needs `VITE_IFRAME_OUTPUT_URI` set in its environment:

- Production: `https://runtusercontent.com`
- Preview: `https://preview.runtusercontent.com`
- Local: `http://localhost:8000`

## Monitoring

View logs:

```bash
pnpm logs              # Production logs
pnpm logs:preview     # Preview logs
```

## Troubleshooting

1. **Content not updating**: Check browser console for PostMessage errors
2. **Height issues**: Ensure content has finished rendering before height measurement
3. **CORS errors**: Verify the worker is setting appropriate headers
4. **DNS issues**: Ensure DNS is properly configured in Cloudflare
