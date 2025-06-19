# Google OAuth Demo Setup

This demo shows how to set up Google OAuth for Anode notebooks, enabling secure access from mobile devices anywhere in the world.

## Demo Scenario

You want to:
1. Develop notebooks locally without authentication hassle
2. Deploy to production with secure Google OAuth
3. Access your notebooks from mobile devices anywhere
4. Demo the collaborative features to others securely

## Step-by-Step Demo

### 1. Local Development (No Auth Required)

```bash
# Clone and setup
git clone <your-repo>
cd anode
pnpm install

# Start development - works immediately!
pnpm dev
```

Visit `http://localhost:5173` - you're automatically signed in as "Local User".

### 2. Enable Google OAuth for Production

#### Get Google Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project: "anode-demo"
3. Enable Google+ API
4. Create OAuth client ID:
   - Type: Web application
   - Name: "Anode Notebooks"
   - Authorized origins: `https://your-worker.your-subdomain.workers.dev`
   - Authorized redirect URIs: `https://your-worker.your-subdomain.workers.dev`

#### Configure Environment

Edit `packages/web-client/.env`:
```env
# Enable Google OAuth
VITE_GOOGLE_AUTH_ENABLED=true
VITE_GOOGLE_CLIENT_ID=123456789-abcdef.apps.googleusercontent.com

# Keep for local dev
VITE_AUTH_TOKEN=insecure-token-change-me
```

#### Deploy Worker with OAuth

```bash
# Set Google Client ID in Cloudflare
cd packages/docworker
pnpm wrangler secret put GOOGLE_CLIENT_ID --env prototype

# Deploy
pnpm wrangler deploy --env prototype
```

### 3. Test the Full Flow

#### Local Development (Still Works!)
```bash
pnpm dev
# Visit http://localhost:5173
# Still auto-signed in as "Local User"
```

#### Production with OAuth
```bash
# Visit your deployed worker URL
# https://anode-docworker-prototype.your-subdomain.workers.dev
```

You'll see:
1. **Sign-in screen** with Google button
2. **Google OAuth flow** 
3. **Authenticated access** with your Google profile
4. **User profile dropdown** in top-right corner

### 4. Mobile Demo

1. **Share the production URL** with others
2. **They sign in with Google** - secure and familiar
3. **Create notebooks together** - real-time collaboration
4. **Access from any device** - phones, tablets, laptops

## Demo Script for Presentations

### Opening: "Local Development Made Easy"

```bash
# Show how easy it is to start
pnpm dev
# Open browser - boom, you're in!
```

**Point**: "No configuration needed for development"

### Middle: "Production Security"

```bash
# Show the production URL
open https://your-worker.workers.dev
```

**Point**: "Secure Google OAuth for production, but development stays simple"

### Climax: "Mobile Collaboration"

1. **Open on laptop** - create a notebook
2. **Pull out phone** - sign in with Google, same notebook appears
3. **Edit on phone** - changes appear on laptop in real-time
4. **Invite colleague** - they see everything instantly

**Point**: "Real-time collaboration from anywhere in the world"

## Key Features to Highlight

### 🔧 Developer Experience
- **Zero config** for local development
- **Hot reload** and instant updates
- **No authentication friction** while coding

### 🔐 Production Security
- **Google OAuth** for trusted authentication
- **Server-side token validation**
- **Secure cookie handling**

### 📱 Mobile-First
- **Responsive design** works on all devices
- **Touch-friendly** interface
- **Offline-first** with sync when connected

### 🤝 Collaboration
- **Real-time editing** with conflict resolution
- **User presence** indicators
- **Shared notebooks** across teams

## Common Demo Questions

### "How do you handle offline editing?"
**Answer**: "LiveStore provides offline-first architecture. Edit without internet, sync when reconnected."

### "What about security?"
**Answer**: "Google OAuth with server-side validation. Tokens are verified by Cloudflare Workers, not just trusted."

### "Can I use my own domain?"
**Answer**: "Yes! Just update the OAuth origins and deploy to your custom domain."

### "How does real-time sync work?"
**Answer**: "Event-sourcing with WebSockets. Every change is an event, automatically merged across clients."

## Deployment Variations

### Personal Demo
```bash
# Use default worker name
pnpm wrangler deploy
```

### Team Demo
```bash
# Use custom name
pnpm wrangler deploy --name anode-team-demo
```

### Conference Demo
```bash
# Use branded name
pnpm wrangler deploy --name anode-conf-2024
```

## Troubleshooting Demo Issues

### "Google Sign-In Not Working"
- Check OAuth origins match your deployed URL exactly
- Verify `GOOGLE_CLIENT_ID` secret is set in Cloudflare
- Ensure `VITE_GOOGLE_CLIENT_ID` matches the secret

### "Local Development Broken"
- Make sure `VITE_AUTH_TOKEN` is set in `.env`
- Check that `VITE_GOOGLE_AUTH_ENABLED` is `false` or unset for local

### "Mobile Not Loading"
- Verify HTTPS is working (required for OAuth)
- Check responsive design in browser dev tools first
- Test OAuth flow in incognito mode

## Advanced Demo Features

### Show the LiveStore DevTools
```javascript
// In browser console
window.liveStore.debug = true
```

### Demonstrate Event Sourcing
1. Make changes in notebook
2. Show events in DevTools
3. Demonstrate undo/redo
4. Show conflict resolution

### Performance Metrics
- Open browser DevTools
- Show FPS meter in top-right
- Demonstrate smooth real-time updates
- Show offline/online sync behavior

## Next Steps After Demo

1. **Fork the repository** and customize
2. **Set up your own Google OAuth** credentials
3. **Deploy to your domain** for team use
4. **Explore the AI features** with OpenAI integration
5. **Contribute back** improvements and bug fixes

This demo showcases the perfect balance: simple development experience with production-ready security.