# Kernel Connection Guide

## Overview

Anode uses a manual kernel architecture where each notebook requires its own kernel instance to execute code. This guide explains how to connect kernels to your notebooks.

## Architecture

- **One Kernel Per Notebook**: Each notebook (identified by its `NOTEBOOK_ID`) requires a dedicated kernel instance
- **Manual Start**: Kernels must be started manually via command line
- **Automatic Connection**: Once started, kernels automatically connect to the notebook and begin processing execution requests
- **Session Management**: Each kernel restart gets a unique `sessionId` for tracking

## Quick Start

### 1. Identify Your Notebook ID

Your notebook ID is shown in the UI and is the same as the store ID. You can find it:
- In the URL as the `notebook` parameter: `?notebook=notebook-123-abc`
- In the kernel helper panel (click the "Kernel" button in the notebook header)
- In the notebook list view

### 2. Start the Kernel

Open a terminal and run:

```bash
NOTEBOOK_ID=your-notebook-id pnpm dev:kernel
```

**Example:**
```bash
NOTEBOOK_ID=notebook-1749845652584-2b2uydujic7 pnpm dev:kernel
```

### 3. Verify Connection

Once the kernel starts, you should see:
- Green status indicator in the notebook UI
- Kernel badge shows a filled circle (●) instead of empty (○)
- Ability to execute code cells

## UI Indicators

### Kernel Status Button
Click the "Kernel" button in the notebook header to see:
- **Green dot**: Kernel connected and ready
- **Yellow dot**: Kernel starting up
- **Red dot**: No kernel connected

### Kernel Badge
The kernel type badge shows connection status:
- `python3 ●` - Connected
- `python3 ○` - Disconnected

### Kernel Helper Panel
The kernel helper panel provides:
- Current connection status
- Copy-to-clipboard command for your specific notebook
- Session details when connected
- Connection instructions when disconnected

## Kernel Lifecycle

### Starting Up
1. Run the `pnpm dev:kernel` command with your `NOTEBOOK_ID`
2. Kernel registers with the notebook store
3. Status changes from "disconnected" to "starting" to "ready"
4. Kernel begins processing execution requests from the queue

### Heartbeat System
- Kernels send heartbeats every 30 seconds
- UI shows "Last Heartbeat" timestamp
- Helps detect disconnected kernels

### Session Tracking
- Each kernel restart gets a unique `sessionId`
- Session IDs are used for execution assignment
- Future: Will be used for authentication and permission validation

## Troubleshooting

### Kernel Won't Start
- Ensure you're in the project root directory
- Check that `pnpm` is installed and working
- Verify the `NOTEBOOK_ID` matches your current notebook
- Check terminal output for error messages

### Kernel Disconnects
- Check terminal running the kernel for errors
- Restart the kernel with the same command
- New session will be created automatically

### Code Won't Execute
- Verify kernel status is "ready" (green indicator)
- Check that the kernel type matches your cell type
- Look for errors in both the notebook UI and kernel terminal

### Multiple Kernels
If you accidentally start multiple kernels for the same notebook:
- Stop extra kernel processes (Ctrl+C in terminal)
- The most recent session will be active
- Old sessions will be marked as inactive

## Development Notes

### Current Limitations
- Manual kernel management (no auto-start)
- One kernel per notebook required
- No kernel permission enforcement yet
- No automatic restart on failure

### Future Improvements
- Automatic kernel startup
- Kernel permission validation via document worker
- Better error handling and recovery
- Multiple kernel types per notebook

## Architecture Details

### Event Flow
1. User executes cell → `executionRequested` event
2. Kernel polls execution queue
3. Kernel claims work → `executionAssigned` event  
4. Kernel starts execution → `executionStarted` event
5. Kernel completes execution → `executionCompleted` event

### Session Management
- Kernels register via `kernelSessionStarted` event
- Heartbeats sent via `kernelSessionHeartbeat` event
- Sessions tracked in `kernelSessions` table
- Execution queue uses session IDs for assignment

### Database Tables
- `kernelSessions`: Active kernel instances
- `executionQueue`: Pending and completed execution requests
- `cells`: Cell execution state and results

## Commands Reference

```bash
# Start kernel for specific notebook
NOTEBOOK_ID=notebook-123-abc pnpm dev:kernel

# Start core services (separate terminal)
pnpm dev

# Reset storage if needed
pnpm reset-storage
```

## Related Documentation

- [AGENTS.md](../AGENTS.md) - General development context
- [Architecture Improvement](./architecture-improvement-remove-redundant-timestamps.md) - Recent schema improvements
- [Clean Architecture Summary](./clean-architecture-implementation-summary.md) - Implementation details