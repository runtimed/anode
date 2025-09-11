import React, { useState } from "react";
import { useQuery, useStore } from "@livestore/react";
import { queryDb, sql, Schema } from "@livestore/livestore";

import { tables, events, queries } from "@/schema";
import { schema } from "../../schema.js";
import { Database } from "lucide-react";
import { Button } from "@/components/ui/button";

const useAvailableTables = () => {
  return useQuery(
    queryDb(
      {
        query: sql`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`,
        schema: Schema.Array(Schema.Struct({ name: Schema.String })),
      },
      { label: "debug.tables" }
    )
  );
};

const DebugCell = ({
  cellId,
  cellIndex,
}: {
  cellId: string;
  cellIndex: number;
}) => {
  const cell = useQuery(queries.cellQuery.byId(cellId));

  if (!cell) {
    return (
      <div className="animate-pulse border-4 border-red-500 bg-red-900 p-4 text-xl font-bold text-white">
        CELL ID '{cellId}' DOES NOT EXIST
      </div>
    );
  }

  return (
    <details className="group open:bg-muted/50">
      <summary className="hover:bg-muted/50 cursor-pointer rounded p-1 font-mono text-xs">
        {cellIndex + 1}. {cell.cellType} ({cellId.slice(-8)})
      </summary>
      <div className="px-2">
        <pre className="bg-card mt-1 max-w-full overflow-x-auto rounded border p-2 text-xs">
          {JSON.stringify(cell, null, 2)}
        </pre>
        <DebugCellOutputs key={cellId} cellId={cellId} cellIndex={cellIndex} />
      </div>
    </details>
  );
};

const DebugCellOutputs = ({
  cellId,
  cellIndex,
}: {
  cellId: string;
  cellIndex: number;
}) => {
  const outputs = useQuery(queries.cellQuery.outputs(cellId));
  const cell = useQuery(queries.cellQuery.byId(cellId));

  if (!cell) {
    return null; // Don't show outputs for non-existent cells
  }

  if (!outputs || outputs.length === 0) {
    return (
      <details className="group">
        <summary className="hover:bg-muted/50 text-muted-foreground cursor-pointer rounded p-1 font-mono text-xs">
          {cellIndex + 1}. {cell.cellType} ({cellId.slice(-8)}) - No outputs
        </summary>
      </details>
    );
  }

  return (
    <>
      {outputs.map((output, outputIndex) => (
        <details key={output.id} className="group">
          <summary className="hover:bg-muted/30 bg-muted/20 cursor-pointer rounded p-1 font-mono text-xs">
            Output {outputIndex + 1}: (pos: {output.position})
            {output.mimeType && ` - ${output.mimeType}`}
          </summary>
          <pre className="bg-card mt-1 max-w-full overflow-x-auto rounded border p-2 text-xs">
            {JSON.stringify(output, null, 2)}
          </pre>
        </details>
      ))}
    </>
  );
};

const inflightExecutionQueue$ = queryDb(
  tables.executionQueue
    .select()
    .where({
      status: {
        op: "IN",
        value: ["pending", "assigned", "executing", "failed"],
      },
    })
    .orderBy("id", "desc")
);

const DebugPanel: React.FC = () => {
  const { store } = useStore();
  const availableTables = useAvailableTables();
  const [buttonState, setButtonState] = useState<"default" | "success">(
    "default"
  );

  const notebookMetadata = useQuery(queries.notebookMetadata$);
  const cellIds = useQuery(queries.cellIDs$);
  const runtimeSessions = useQuery(queries.runtimeSessions$);
  const executionQueue = useQuery(inflightExecutionQueue$);

  return (
    <div className="bg-muted/5 w-full overflow-y-auto">
      <a
        target="_blank"
        rel="noopener noreferrer"
        href={`${window.location.protocol}//${window.location.hostname}${window.location.port ? `:${window.location.port}` : ""}/_livestore/web/${store.storeId}/${store.clientSession.clientId}/${store.sessionId}/default`}
        className="hover:bg-muted flex items-center gap-1 border-b py-2 text-sm text-blue-500 hover:underline"
      >
        <Database className="size-4" />
        LiveStore DevTools →
      </a>

      <div className="space-y-4 pt-4">
        <DebugVersion />
        {/* Available Tables */}
        <div>
          <h4 className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            Available Tables ({availableTables.length})
          </h4>
          <div className="bg-card max-h-32 overflow-y-auto rounded border p-2 text-xs">
            {availableTables.length > 0 ? (
              <div className="space-y-1">
                {availableTables.map(({ name }) => (
                  <div key={name} className="font-mono text-xs">
                    • {name}
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
          <h4 className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            Notebook
          </h4>
          <pre className="bg-card max-w-full overflow-x-auto rounded border p-2 text-xs">
            {JSON.stringify(
              Object.fromEntries(notebookMetadata.map((m) => [m.key, m.value])),
              null,
              2
            )}
          </pre>
        </div>

        {/* Cells Data */}
        <div>
          <h4 className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            Cells ({cellIds.length})
          </h4>
          <div className="space-y-2">
            {cellIds.map((cellId, index) => (
              <DebugCell key={cellId} cellId={cellId} cellIndex={index} />
            ))}
          </div>
        </div>

        {/* Runtime Sessions */}
        <div>
          <h4 className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            Runtime Sessions ({runtimeSessions.length})
          </h4>
          <div className="space-y-2">
            {runtimeSessions.map((session, index) => (
              <details key={session.sessionId} className="group">
                <summary className="hover:bg-muted/50 cursor-pointer rounded p-1 font-mono text-xs">
                  {index + 1}. {session.status} ({session.sessionId.slice(-8)})
                  {session.isActive && (
                    <span className="ml-1 text-green-600">●</span>
                  )}
                </summary>
                <pre className="bg-card mt-1 max-w-full overflow-x-auto rounded border p-2 text-xs">
                  {JSON.stringify(session, null, 2)}
                </pre>
              </details>
            ))}
          </div>
        </div>

        {/* Execution Queue */}
        <div>
          <h4 className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            Execution Queue ({executionQueue.length})
          </h4>
          <div className="space-y-2">
            {executionQueue.slice(0, 10).map((entry, index) => (
              <details key={entry.id} className="group">
                <summary className="hover:bg-muted/50 cursor-pointer rounded p-1 font-mono text-xs">
                  {index + 1}. {entry.status} - Cell{" "}
                  {entry.cellId?.slice(-8) || "unknown"}
                </summary>
                <pre className="bg-card mt-1 max-w-full overflow-x-auto rounded border p-2 text-xs">
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
          <h4 className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            Store Info
          </h4>
          <div className="bg-card space-y-1 rounded border p-2 text-xs">
            <div>
              Store ID: <code className="font-mono">{store.storeId}</code>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            Session Info
          </h4>
          <div className="bg-card space-y-1 rounded border p-2 text-xs">
            <div>
              Session ID: <code className="font-mono">{store.sessionId}</code>
            </div>
          </div>
        </div>

        {/* Debug Actions */}
        <div>
          <h4 className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
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

                  console.log("✅ Runt Debug Globals Set:");
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

function DebugVersion() {
  const { store } = useStore();
  const debugVersion = useQuery(
    queryDb(
      tables.debug.select("version").first({
        fallback: () => {
          return "unknown";
        },
      })
    )
  );

  const setDebugVersion = () => {
    store.commit(events.debug1({ id: "debug-id-1" }));
  };

  if (debugVersion === "unknown") {
    return (
      <Button
        variant="outline"
        size="sm"
        className="w-full text-xs"
        onClick={setDebugVersion}
      >
        Set Debug Version
      </Button>
    );
  }

  return <div className="font-mono text-xs">Debug Version: {debugVersion}</div>;
}

export { DebugPanel };
