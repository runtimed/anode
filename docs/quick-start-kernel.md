# Quick Start: Kernel Connection

## TL;DR

1. **Find your notebook ID** - Look in the URL or click the "Kernel" button in the notebook header
2. **Open a terminal** in the project root
3. **Run the kernel command**:
   ```bash
   NOTEBOOK_ID=your-notebook-id pnpm dev:kernel
   ```
4. **Check the status** - Green dot = connected, ready to execute code **instantly** (reactive architecture)

## Example

If your URL is: `http://localhost:5173/?notebook=notebook-1749845652584-2b2uydujic7`

Then run:
```bash
NOTEBOOK_ID=notebook-1749845652584-2b2uydujic7 pnpm dev:kernel
```

## Visual Indicators

- **Kernel Button**: Click to see connection status and copy command
- **Kernel Badge**: `python3 ●` (connected) vs `python3 ○` (disconnected)  
- **Status Colors**: 🟢 Ready (instant execution) | 🟡 Starting | 🔴 Disconnected

## Performance

- **⚡ Zero-latency execution** - Code runs instantly when you press run
- **🔄 Reactive architecture** - No polling delays (old system had 500ms-2s delays)
- **📡 Real-time work detection** via LiveStore reactive subscriptions

## Troubleshooting

**Kernel won't start?**
- Make sure you're in the anode project root directory
- Double-check the NOTEBOOK_ID matches your current notebook

**Code won't execute?**
- Verify you see a green status indicator
- Check the terminal running the kernel for errors
- Should execute instantly with reactive architecture - any delay indicates an issue

**Need help?**
- Click the "Kernel" button in the notebook header for detailed status and commands
- See [kernel-connection-guide.md](./kernel-connection-guide.md) for full documentation