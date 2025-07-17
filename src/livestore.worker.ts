import { makeWorker } from "@livestore/adapter-web/worker";
import { makeCfSync } from "@livestore/sync-cf";

import { schema } from "@runt/schema";

function getLiveStoreUrl(): string {
  const syncUrl = import.meta.env.VITE_LIVESTORE_SYNC_URL;

  // If it's a relative path, construct the full WebSocket URL
  if (syncUrl.startsWith("/")) {
    // In worker context, we need to use self.location instead of window.location
    const location =
      typeof window !== "undefined" ? window.location : self.location;
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${location.host}${syncUrl}`;
  }

  // Otherwise use the provided full URL
  return syncUrl;
}

makeWorker({
  schema,
  sync: {
    backend: makeCfSync({ url: getLiveStoreUrl() }),
    initialSyncOptions: { _tag: "Blocking", timeout: 5000 },
    onSyncError: "ignore",
  },
});
