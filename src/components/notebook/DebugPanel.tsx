import React, { useState } from "react";
import { useStore } from "@livestore/react";
import { queryDb, sql, Schema } from "@livestore/livestore";

import {
  CellData,
  KernelSessionData,
  tables,
  schema,
  events,
} from "@runt/schema";
import { Bug } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DebugPanelProps {
  notebook: any;
  cells: CellData[];
  allKernelSessions: KernelSessionData[];
  executionQueue: any[];
  currentNotebookId: string;
  runtimeHealth: string;
}

// Hook for discovering available tables
const useAvailableTables = () => {
  const { store } = useStore();

  // Query available tables
  const availableTables = React.useMemo(() => {
    try {
      const result = store.query(
        queryDb({
          query: sql`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`,
          schema: Schema.Array(Schema.Struct({ name: Schema.String })),
        })
      );
      const tableNames = result.map((row) => row.name);

      // Sort tables with __ prefixed tables at the bottom
      return tableNames.sort((a, b) => {
        const aHasPrefix = a.startsWith("__");
        const bHasPrefix = b.startsWith("__");

        if (aHasPrefix && !bHasPrefix) return 1;
        if (!aHasPrefix && bHasPrefix) return -1;
        return a.localeCompare(b);
      });
    } catch (error) {
      console.error("Failed to query available tables:", error);
      return [];
    }
  }, [store]);

  return availableTables;
};

const DebugPanel: React.FC<DebugPanelProps> = ({
  notebook,
  cells,
  allKernelSessions,
  executionQueue,
  currentNotebookId,
  runtimeHealth,
}) => {
  const { store } = useStore();
  const availableTables = useAvailableTables();
  const [buttonState, setButtonState] = useState<"default" | "success">(
    "default"
  );

  return (
    <div className="bg-muted/5 w-96 overflow-y-auto border-l">
      <div className="bg-card border-b p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Bug className="h-4 w-4" />
          Anode Debug Panel
        </h3>
      </div>

      <div className="space-y-4 p-4">
        {/* Available Tables */}
        <div>
          <h4 className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
            Available Tables ({availableTables.length})
          </h4>
          <div className="bg-card max-h-32 overflow-y-auto rounded border p-2 text-xs">
            {availableTables.length > 0 ? (
              <div className="space-y-1">
                {availableTables.map((tableName) => (
                  <div key={tableName} className="font-mono text-xs">
                    • {tableName}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground text-center">
                No tables discovered
              </div>
            )}
          </div>
        </div>

        {/* Notebook Data */}
        <div>
          <h4 className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
            Notebook
          </h4>
          <pre className="bg-card overflow-x-auto rounded border p-2 text-xs">
            {JSON.stringify(notebook, null, 2)}
          </pre>
        </div>

        {/* Cells Data */}
        <div>
          <h4 className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
            Cells ({cells.length})
          </h4>
          <div className="space-y-2">
            {cells.map((cell, index) => (
              <details key={cell.id} className="group">
                <summary className="hover:bg-muted/50 cursor-pointer rounded p-1 font-mono text-xs">
                  {index + 1}. {cell.cellType} ({cell.id.slice(-8)})
                </summary>
                <pre className="bg-card mt-1 overflow-x-auto rounded border p-2 text-xs">
                  {JSON.stringify(cell, null, 2)}
                </pre>
              </details>
            ))}
          </div>
        </div>

        {/* Runtime Sessions */}
        <div>
          <h4 className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
            Runtime Sessions ({allKernelSessions.length})
          </h4>
          <div className="space-y-2">
            {allKernelSessions.map((session, index) => (
              <details key={session.sessionId} className="group">
                <summary className="hover:bg-muted/50 cursor-pointer rounded p-1 font-mono text-xs">
                  {index + 1}. {session.status} ({session.sessionId.slice(-8)})
                  {session.isActive && (
                    <span className="ml-1 text-green-600">●</span>
                  )}
                </summary>
                <pre className="bg-card mt-1 overflow-x-auto rounded border p-2 text-xs">
                  {JSON.stringify(session, null, 2)}
                </pre>
              </details>
            ))}
          </div>
        </div>

        {/* Execution Queue */}
        <div>
          <h4 className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
            Execution Queue ({executionQueue.length})
          </h4>
          <div className="space-y-2">
            {executionQueue.slice(0, 10).map((entry, index) => (
              <details key={entry.id} className="group">
                <summary className="hover:bg-muted/50 cursor-pointer rounded p-1 font-mono text-xs">
                  {index + 1}. {entry.status} - Cell{" "}
                  {entry.cellId?.slice(-8) || "unknown"}
                </summary>
                <pre className="bg-card mt-1 overflow-x-auto rounded border p-2 text-xs">
                  {JSON.stringify(entry, null, 2)}
                </pre>
              </details>
            ))}
            {executionQueue.length > 10 && (
              <div className="text-muted-foreground text-xs">
                ... and {executionQueue.length - 10} more entries
              </div>
            )}
          </div>
        </div>

        {/* Store Info */}
        <div>
          <h4 className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
            Store Info
          </h4>
          <div className="bg-card space-y-1 rounded border p-2 text-xs">
            <div>
              Store ID: <code className="font-mono">{store.storeId}</code>
            </div>
            <div>
              Notebook ID:{" "}
              <code className="font-mono">{currentNotebookId}</code>
            </div>
            <div>
              Runtime Health: <code className="font-mono">{runtimeHealth}</code>
            </div>
          </div>
        </div>

        {/* Debug Actions */}
        <div>
          <h4 className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
            Debug Actions
          </h4>
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (
                  (window as any).__debugLiveStore?.[store.storeId]?._dev
                    ?.downloadDb
                ) {
                  (window as any).__debugLiveStore[
                    store.storeId
                  ]._dev.downloadDb();
                }
              }}
              className="w-full text-xs"
            >
              Download SQLite DB
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (
                  (window as any).__debugLiveStore?.[store.storeId]?._dev
                    ?.downloadEventlogDb
                ) {
                  (window as any).__debugLiveStore[
                    store.storeId
                  ]._dev.downloadEventlogDb();
                }
              }}
              className="w-full text-xs"
            >
              Download Eventlog DB
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const debugStore = (window as any).__debugLiveStore?.[
                  store.storeId
                ];
                if (debugStore) {
                  // Set globals
                  (globalThis as any).store = debugStore;
                  (globalThis as any).tables = tables;
                  (globalThis as any).schema = schema;
                  (globalThis as any).events = events;

                  console.log("✅ Anode Debug Globals Set:");
                  console.log("📦 store  - LiveStore debug instance");
                  console.log("📋 tables - Database table definitions");
                  console.log("🔧 schema - LiveStore schema");
                  console.log("⚡ events - Event definitions");

                  console.table({
                    "store._dev.downloadDb()": "Download SQLite DB",
                    "store._dev.syncStates()": "Check Sync Status",
                    "store.query(tables.cells.select())": "Query All Cells",
                    "store.query(tables.cells.select().where({cellType: 'code'}))":
                      "Query Code Cells",
                    "store.query(tables.outputs.select())": "Query Outputs",
                    "store.query(tables.executionQueue.select())":
                      "Query Execution Queue",
                    "store.commit(events.cellCreated({id: 'new-id', cellType: 'code', position: 0}))":
                      "Create Cell Event",
                  });

                  // Visual feedback
                  setButtonState("success");
                  setTimeout(() => setButtonState("default"), 2000);
                }
              }}
              className={`w-full bg-gray-600 text-xs text-white transition-all hover:shadow-lg hover:brightness-110 ${
                buttonState === "success"
                  ? "bg-green-600 hover:shadow-lg hover:brightness-110"
                  : ""
              }`}
            >
              {buttonState === "success"
                ? "✅ Globals Set in Console"
                : "Set Debug Globals"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export { DebugPanel };
