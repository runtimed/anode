# Runtime Session Renewal System

## Overview

The Runtime Session Renewal system provides reliable runtime session tracking in Anode's offline-first notebook environment. It solves the problem of detecting when browser-based runtime agents become unavailable (e.g., when tabs are closed) without relying on server-side connection tracking.

## Problem Statement

In an offline-first architecture like Anode:

- **Network is optional** - notebooks should work without connectivity
- **Browser runtimes are ephemeral** - they disappear when tabs close without notification
- **LiveStore 0.3.x limitations** - can't modify sync backend connection tracking
- **Event log pollution concerns** - don't want constant heartbeat spam

Traditional server-side heartbeat systems don't work well in this context because they assume always-on connectivity and server-side state management.

## Solution: Duration-Based Session Expiry

Instead of constant heartbeats, we use **lightweight session renewals** with **client-side expiry detection**:

1. **Periodic Renewals**: Runtime agents send renewal events every 15 seconds
2. **Deterministic Expiry**: Each renewal includes a validity duration (30 seconds)
3. **Client-Side Detection**: UI components check expiry times locally
4. **Automatic Cleanup**: Expired sessions are marked as terminated

## Architecture

### Constants

```typescript
// Schema-level constant for consistent timeout across clients
export const RUNTIME_SESSION_TIMEOUT_MS = 30000; // 30 seconds
```

### Event Schema

```typescript
runtimeSessionRenewal: Events.synced({
  name: "v1.RuntimeSessionRenewal",
  schema: Schema.Struct({
    sessionId: Schema.String,
    renewedAt: Schema.Date.annotations({
      description: "UTC timestamp when session was renewed",
    }),
    validForMs: Schema.Number.annotations({
      description: "Duration in milliseconds that this renewal is valid for",
    }),
  }),
}),
```

### Database Schema

```typescript
runtimeSessions: State.SQLite.table({
  // ... existing columns ...

  // Session renewal tracking
  lastRenewedAt: State.SQLite.datetime({ nullable: true }),
  expiresAt: State.SQLite.datetime({ nullable: true }),
}),
```

### Materializer

```typescript
"v1.RuntimeSessionRenewal": ({ sessionId, renewedAt, validForMs }) => {
  // Deterministic computation of expiry time from renewal time + duration
  const expiresAt = new Date(renewedAt.getTime() + validForMs);
  return tables.runtimeSessions
    .update({
      lastRenewedAt: renewedAt,
      expiresAt: expiresAt,
    })
    .where({ sessionId });
},
```

## Implementation Details

### Runtime Agent Integration

Runtime agents automatically start session renewal when they start:

```typescript
class RuntimeAgent {
  private renewalInterval?: NodeJS.Timeout;

  async start() {
    // ... existing startup logic ...
    this.startSessionRenewal();
  }

  private startSessionRenewal(): void {
    // Renew every 15 seconds (half of 30s timeout for safety)
    this.renewalInterval = setInterval(() => {
      if (!this.isShuttingDown && this.store) {
        const renewedAt = new Date();
        const validForMs = RUNTIME_SESSION_TIMEOUT_MS;

        this.store.commit(
          events.runtimeSessionRenewal({
            sessionId: this.config.sessionId,
            renewedAt,
            validForMs,
          })
        );
      }
    }, 15000);
  }

  async shutdown() {
    // Clean up renewal interval
    if (this.renewalInterval) {
      clearInterval(this.renewalInterval);
    }
    // ... existing shutdown logic ...
  }
}
```

### Health Detection

The `useRuntimeHealth` hook includes expiry detection:

```typescript
const getRuntimeHealth = (session: RuntimeSessionData): RuntimeHealth => {
  const now = new Date();

  // Check session expiry first (most important for browser runtimes)
  if (session.lastRenewedAt) {
    const timeSinceRenewal = now.getTime() - session.lastRenewedAt.getTime();
    const toleranceMs = 15000; // 15s tolerance for clock skew/network delays
    const maxAllowedGap = RUNTIME_SESSION_TIMEOUT_MS + toleranceMs; // 45s total

    if (timeSinceRenewal > maxAllowedGap) {
      return "disconnected";
    }

    // Warning if getting close to expiry
    if (timeSinceRenewal > RUNTIME_SESSION_TIMEOUT_MS) {
      return "warning";
    }
  }

  // ... standard status checks
};
```

### Automatic Cleanup

The enhanced hook includes cleanup of expired sessions:

```typescript
export const useRuntimeHealthWithCleanup = () => {
  const health = useRuntimeHealth();
  const { store } = useStore();

  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = new Date();
      const toleranceMs = 15000;

      runtimeSessions.forEach((session) => {
        if (session.lastRenewedAt) {
          const timeSinceRenewal =
            now.getTime() - session.lastRenewedAt.getTime();
          const maxAllowedGap = RUNTIME_SESSION_TIMEOUT_MS + toleranceMs;

          if (timeSinceRenewal > maxAllowedGap && session.isActive) {
            store.commit(
              events.runtimeSessionTerminated({
                sessionId: session.sessionId,
                reason: "timeout",
              })
            );
          }
        }
      });
    }, 30000); // Check every 30 seconds

    return () => clearInterval(cleanup);
  }, [runtimeSessions, store]);

  return health;
};
```

## Benefits

1. **Minimal Event Spam**: Only one renewal per 15 seconds (vs constant heartbeats)
2. **Offline Compatible**: All logic runs locally, no server dependency required
3. **Browser Crash Resilient**: If browser/tab crashes, renewals stop and session expires automatically
4. **Works with LiveStore 0.3.x**: Uses existing event system, no connection tracking needed
5. **Local-First Philosophy**: Session state is managed locally and synced when connected
6. **Deterministic**: All clients will eventually agree on session expiry times
7. **Clock Skew Tolerant**: Built-in tolerance for reasonable clock differences

## Configuration

### Timeout Duration

Adjust the session timeout by changing the constant:

```typescript
// In schema.ts
export const RUNTIME_SESSION_TIMEOUT_MS = 45000; // 45 seconds instead of 30
```

### Renewal Frequency

The renewal interval is automatically set to half the timeout duration for safety. To customize:

```typescript
// In RuntimeAgent
private startSessionRenewal(): void {
  const renewalIntervalMs = Math.floor(RUNTIME_SESSION_TIMEOUT_MS / 2);
  this.renewalInterval = setInterval(/* ... */, renewalIntervalMs);
}
```

### Cleanup Frequency

Adjust how often expired sessions are cleaned up:

```typescript
// In useRuntimeHealthWithCleanup
const cleanup = setInterval(() => {
  // ... cleanup logic
}, 60000); // Check every minute instead of 30 seconds
```

## Usage

### Basic Usage

Runtime agents automatically start renewal - no additional setup required:

```typescript
const agent = new RuntimeAgent(config, capabilities);
await agent.start(); // Starts automatic renewal
```

### Health Monitoring

Use the enhanced hook for automatic cleanup:

```typescript
import { useRuntimeHealthWithCleanup } from '../hooks/useRuntimeHealth';

const MyComponent = () => {
  const { runtimeHealth, hasActiveRuntime } = useRuntimeHealthWithCleanup();

  return (
    <div>
      Status: {runtimeHealth}
      {hasActiveRuntime ? '✅ Connected' : '❌ Disconnected'}
    </div>
  );
};
```

### Console Launcher Integration

The console launcher shows renewal status:

```typescript
const status = window.__RUNT_LAUNCHER__.getStatus();
console.log("Session renewal active:", status.sessionRenewalActive);
console.log("Last renewal:", status.lastRenewal);
```

## Troubleshooting

### Session Shows as Disconnected

1. **Check if runtime agent is running**: Use console launcher status
2. **Verify renewal events**: Check LiveStore devtools for `v1.RuntimeSessionRenewal` events
3. **Clock skew issues**: Ensure system clocks are reasonably synchronized

### High Event Volume

If renewal events are too frequent:

1. Increase `RUNTIME_SESSION_TIMEOUT_MS`
2. Renewal frequency automatically adjusts to half the timeout

### Sessions Not Cleaning Up

1. **Verify cleanup hook is active**: Use `useRuntimeHealthWithCleanup` instead of basic hook
2. **Check cleanup interval**: Default is 30 seconds, may need adjustment
3. **Tolerance too high**: Reduce tolerance in cleanup logic if needed

## Migration Notes

### From Manual Health Checks

Replace manual connection checking:

```typescript
// Before
const checkRuntimeAlive = async () => {
  // Manual ping/pong logic
};

// After
const { runtimeHealth } = useRuntimeHealthWithCleanup();
// Automatic expiry detection
```

### Updating Existing Components

Replace basic health hook:

```typescript
// Before
import { useRuntimeHealth } from "../hooks/useRuntimeHealth";

// After
import { useRuntimeHealthWithCleanup as useRuntimeHealth } from "../hooks/useRuntimeHealth";
```

## Future Enhancements

1. **Adaptive Renewal Frequency**: Adjust based on network conditions
2. **Runtime-Specific Timeouts**: Different timeouts for different runtime types
3. **Health Score Metrics**: More granular health reporting based on renewal consistency
4. **Offline Awareness**: Pause renewal when offline to avoid event buildup

## Testing

The system includes comprehensive tests:

```bash
# Run session renewal tests
npm test runtime-session-renewal.test.ts
```

Key test scenarios:

- Renewal events are committed periodically
- Expiry detection works correctly
- Cleanup stops after shutdown
- Clock skew tolerance
- Materializer determinism

## Related Documentation

- [Runtime Health Monitoring](./runtime-health.md)
- [LiveStore Event Sourcing](./livestore-events.md)
- [Console Runtime Launcher](../src/runtime/README.md)
