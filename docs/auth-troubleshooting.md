# Authentication Troubleshooting Guide

This guide helps resolve common authentication issues in Anode, especially the dreaded "UNAUTHORIZED" page loop.

## Quick Recovery Options

### 🚨 Emergency Auth Reset

If you're completely stuck with authentication, try these in order:

#### Option 1: URL Parameter Reset

Add `?reset_auth=true` to any Anode URL:

```
https://app.runt.run?reset_auth=true
# or locally:
http://localhost:5173?reset_auth=true
```

This will:

- Clear all authentication tokens
- Reset auth state
- Redirect you to login

#### Option 2: Browser DevTools Reset

1. Open browser DevTools (F12)
2. Go to **Application** → **Local Storage**
3. Delete these keys:
   - `openid_tokens`
   - `openid_request_state`
   - `local-auth-registration`
4. Refresh the page

#### Option 3: Clear All Site Data

1. In Chrome: Settings → Privacy → Site Settings → View permissions and data stored across sites
2. Search for your Anode domain
3. Click "Clear all data"
4. Refresh the page

## Common Issues & Solutions

### Issue 1: "Error Loading Notebooks - UNAUTHORIZED"

**Symptoms:**

- Red "UNAUTHORIZED" message on main page
- Can't access any notebooks
- Stuck in login loop

**Causes:**

- Corrupted localStorage tokens
- Expired authentication tokens
- Schema changes breaking token format
- Network issues during auth flow

**Solutions:**

```bash
# Try emergency reset first (Option 1 above)
# If that fails, check browser console for errors:
# - F12 → Console tab
# - Look for auth-related errors
# - Note any 401/403 HTTP errors
```

### Issue 2: "Authentication not configured" Error

**Symptoms:**

- Error message mentioning missing environment variables
- Local development not starting properly

**Solution:**

```bash
# Check your environment setup
cp .env.example .env

# Ensure these variables are set:
VITE_AUTH_URI=your-auth-server
VITE_AUTH_CLIENT_ID=your-client-id
VITE_AUTH_REDIRECT_URI=http://localhost:5173/oidc

# Restart dev server
pnpm dev
```

### Issue 3: Infinite Loading or White Screen

**Symptoms:**

- Page loads but stays white/loading forever
- No error messages visible

**Debug Steps:**

```bash
# 1. Check browser console for JavaScript errors
# 2. Look for network requests failing in Network tab
# 3. Check if auth endpoints are responding:

curl http://localhost:5173/api/health
# Should return: {"status": "ok"}

# 4. Clear browser cache completely
# 5. Try incognito/private browsing mode
```

### Issue 4: Local OIDC Issues (Development)

**Symptoms:**

- "Local OIDC is disabled" error
- Auth endpoints returning 403

**Solution:**

```bash
# Check your .dev.vars file:
ALLOW_LOCAL_AUTH=true
DEPLOYMENT_ENV=development

# Restart the dev server
pnpm dev
```

## Advanced Debugging

### Enable Debug Mode

Add `?debug=true` to your URL to enable auth state monitoring:

```
http://localhost:5173?debug=true
```

This will log:

- Auth storage changes
- Token validation attempts
- Auth state transitions

### Check Auth State in DevTools

```javascript
// In browser console, inspect current auth state:
console.log("Tokens:", localStorage.getItem("openid_tokens"));
console.log("Request State:", localStorage.getItem("openid_request_state"));

// Check if tokens are corrupted:
try {
  const tokens = JSON.parse(localStorage.getItem("openid_tokens") || "{}");
  console.log("Parsed tokens:", tokens);
  console.log(
    "Access token valid:",
    typeof tokens.accessToken === "string" &&
      tokens.accessToken.split(".").length === 3
  );
} catch (e) {
  console.error("Token parsing failed:", e);
}
```

### Manual Auth Flow Testing

```javascript
// Test auth service manually in console:
import { getOpenIdService } from "./src/services/openid.js";

const service = getOpenIdService();
console.log("Current tokens:", service.getTokens());

// Reset auth if needed:
service.reset();
```

## Prevention Tips

### 1. Avoid Auth Issues

- Don't manually edit localStorage auth data
- Close browser tabs when not using Anode (prevents token conflicts)
- Clear browser data if switching between development and production

### 2. Development Best Practices

```bash
# Always use fresh tokens in development:
# Add this to your local development routine:
curl -X POST http://localhost:5173/local_oidc/reset_tokens

# Keep environment files up to date:
git pull origin main
cp .env.example .env  # if .env is outdated
```

### 3. Production Deployment

```bash
# Ensure production environment variables are set:
AUTH_ISSUER=your-production-auth-server
AUTH_CLIENT_ID=production-client-id

# Test auth endpoints after deployment:
curl https://your-domain/api/health
curl https://your-domain/.well-known/openid_configuration
```

## When to Contact Support

Contact the development team if:

1. **Emergency reset doesn't work** after trying all three options
2. **Auth works locally but fails in production** despite correct environment setup
3. **Multiple users report the same auth issue** (indicates server-side problem)
4. **Auth recovery shows JavaScript errors** that you can't resolve

### Information to Include

When reporting auth issues, provide:

```
1. Browser: Chrome/Firefox/Safari + version
2. Environment: local development / staging / production
3. URL when issue occurred
4. Browser console errors (F12 → Console)
5. Network errors (F12 → Network, look for 4xx/5xx responses)
6. Steps you already tried from this guide
```

## Technical Background

### How Anode Auth Works

1. **Frontend**: React app uses OpenID Connect (OIDC) flow
2. **Token Storage**: Access/refresh tokens stored in localStorage
3. **Backend Sync**: LiveStore uses tokens for real-time collaboration
4. **Token Refresh**: Automatic background refresh every minute
5. **Recovery**: Multiple fallback mechanisms for corrupted state

### Common Token Issues

- **JWT Structure**: Tokens must have 3 parts (header.payload.signature)
- **Expiration**: Tokens older than 1 hour are considered expired
- **Claims Validation**: Must have valid `sub` and `email` fields
- **Storage Corruption**: JSON parsing errors trigger automatic cleanup

### Auth State Flow

```
No Tokens → Login Prompt → OIDC Flow → Token Storage → Authenticated State
     ↑                                                          ↓
     ←────────────── Token Refresh Failure ←──────────────────
```

The recovery mechanisms prevent users from getting stuck in any intermediate state.
