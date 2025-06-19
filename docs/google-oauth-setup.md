# Google OAuth Setup

This guide explains how to set up Google OAuth authentication for Anode notebooks, enabling secure access from anywhere in the world.

## Overview

Anode supports two authentication modes:

1. **Local Development Mode** (default): Uses a simple token for local development
2. **Google OAuth Mode**: Secure authentication for production deployments

## Quick Setup

### For Local Development (Default)

No setup required! Anode works out of the box with local authentication.

```bash
pnpm install
pnpm dev
```

### For Production with Google OAuth

1. **Get Google OAuth Credentials**
2. **Configure Environment Variables**
3. **Deploy with Authentication**

## Step-by-Step Google OAuth Setup

### 1. Create Google OAuth Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized origins:
     - `http://localhost:5173` (for local development)
     - `https://your-domain.com` (for production)
   - Add authorized redirect URIs:
     - `http://localhost:5173` (for local development)
     - `https://your-domain.com` (for production)

### 2. Configure Environment Variables

#### Web Client Configuration

Edit `packages/web-client/.env`:

```env
# Enable Google OAuth
VITE_GOOGLE_AUTH_ENABLED=true
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com

# Keep fallback token for local development
VITE_AUTH_TOKEN=insecure-token-change-me
```

#### Cloudflare Worker Configuration

Set the Google Client ID as a secret in your Cloudflare Worker:

```bash
# For development environment
pnpm wrangler secret put GOOGLE_CLIENT_ID --env development

# For production environment
pnpm wrangler secret put GOOGLE_CLIENT_ID --env prototype
```

When prompted, enter your Google Client ID (same as `VITE_GOOGLE_CLIENT_ID`).

### 3. Deploy and Test

```bash
# Deploy the worker
cd packages/docworker
pnpm deploy

# Start local development
cd ../..
pnpm dev
```

## Authentication Flow

### Local Development Mode

- No Google OAuth setup required
- Uses `VITE_AUTH_TOKEN` for authentication
- Perfect for development and testing

### Google OAuth Mode

1. User visits the application
2. If not authenticated, shows Google Sign-In button
3. User signs in with Google account
4. Google returns an ID token
5. Token is verified by Cloudflare Worker
6. User gains access to notebooks

## Security Features

- **Secure tokens**: Google ID tokens are verified server-side
- **Automatic refresh**: Tokens refresh automatically every 50 minutes
- **HTTPS enforcement**: Production requires HTTPS for security
- **Cross-origin protection**: CORS properly configured

## Environment Variables Reference

### Web Client (`packages/web-client/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_GOOGLE_AUTH_ENABLED` | No | Set to `true` to enable Google OAuth |
| `VITE_GOOGLE_CLIENT_ID` | Yes* | Google OAuth client ID |
| `VITE_AUTH_TOKEN` | Yes** | Fallback token for local development |

*Required when `VITE_GOOGLE_AUTH_ENABLED=true`
**Required when Google OAuth is disabled

### Cloudflare Worker Secrets

| Secret | Required | Description |
|--------|----------|-------------|
| `GOOGLE_CLIENT_ID` | Yes* | Google OAuth client ID (server-side) |
| `AUTH_TOKEN` | Yes** | Fallback token for local development |

*Required for Google OAuth validation
**Required when Google OAuth is not configured

## Troubleshooting

### Common Issues

#### "Invalid auth token" Error

**Cause**: Mismatch between client and server configuration.

**Solution**: Ensure `VITE_GOOGLE_CLIENT_ID` matches the `GOOGLE_CLIENT_ID` secret in Cloudflare Worker.

#### Google Sign-In Button Not Appearing

**Cause**: Google OAuth not properly enabled.

**Solution**: 
1. Check `VITE_GOOGLE_AUTH_ENABLED=true` in `.env`
2. Verify `VITE_GOOGLE_CLIENT_ID` is set
3. Ensure the client ID is valid

#### "Unauthorized domain" Error

**Cause**: Domain not added to Google OAuth configuration.

**Solution**: Add your domain to authorized origins in Google Cloud Console.

#### Token Refresh Issues

**Cause**: Network issues or invalid refresh tokens.

**Solution**: Sign out and sign in again to get fresh tokens.

### Development vs Production

| Feature | Development | Production |
|---------|-------------|------------|
| Authentication | Simple token | Google OAuth |
| HTTPS Required | No | Yes |
| Domain Validation | Localhost only | Configured domains |
| Token Storage | Plain cookies | Secure cookies |

## Mobile Access

Once Google OAuth is configured:

1. Deploy your Cloudflare Worker to production
2. Access your notebook from any device
3. Sign in with your Google account
4. Your notebooks sync across all devices

Perfect for:
- Remote development
- Mobile testing
- Collaborative editing
- Presentations and demos

## Advanced Configuration

### Custom Scopes

To request additional Google permissions, modify the scopes in `google-auth.ts`:

```typescript
const getAuthConfig = (): GoogleAuthConfig => ({
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  enabled: import.meta.env.VITE_GOOGLE_AUTH_ENABLED === 'true',
  scopes: ['profile', 'email', 'additional-scope']
})
```

### Custom Sign-In Flow

The `AuthGuard` component can be customized with a custom fallback:

```tsx
<AuthGuard fallback={<CustomSignInComponent />}>
  <YourApp />
</AuthGuard>
```

### Mixed Mode Development

You can run both authentication modes simultaneously:
- Google OAuth for production testing
- Simple token for local development

The system automatically chooses the appropriate method based on configuration.

## Next Steps

- [Deploy to Production](./deployment.md)
- [Configure Custom Domains](./custom-domains.md)
- [Set up Team Access](./team-access.md)