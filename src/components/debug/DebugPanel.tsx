import { useQuery, useStore } from "@livestore/react";
import { queryDb, Schema, sql } from "@runtimed/schema";
import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { SimpleTooltip } from "@/components/ui/tooltip";
import {
  FeatureFlagKey,
  useFeatureFlag,
  useFeatureFlagContext,
} from "@/contexts/FeatureFlagContext";
import { trpcQueryClient } from "@/lib/trpc-client";
import { lastUsedAiModel$, lastUsedAiProvider$ } from "@/queries";
import { useAvailableAiModels } from "@/util/ai-models";
import { events, queries, schema, tables } from "@runtimed/schema";
import { Database } from "lucide-react";
import { AiCapabilityIcon } from "../ai/AiCapabilityIcon";

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

interface FeatureFlagToggleProps {
  flagKey: FeatureFlagKey;
}

const FeatureFlagToggle = ({ flagKey }: FeatureFlagToggleProps) => {
  const isEnabled = useFeatureFlag(flagKey);
  const { setFlag } = useFeatureFlagContext();

  const toggleFlag = () => {
    setFlag(flagKey, !isEnabled);
  };

  return (
    <div
      className="cursor-default space-y-3 rounded-md border border-1 border-gray-200 p-2 transition-colors hover:bg-gray-100"
      onClick={toggleFlag}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700">{flagKey}</p>
        </div>
        <Switch checked={isEnabled} onCheckedChange={toggleFlag} />
      </div>
    </div>
  );
};

const DebugPanel: React.FC = () => {
  const { store } = useStore();
  const availableTables = useAvailableTables();
  const [buttonState, setButtonState] = useState<"default" | "success">(
    "default"
  );
  const { allFlagKeys } = useFeatureFlagContext();

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
        {/* Feature Flags */}
        <div>
          <h4 className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            Feature Flags ({allFlagKeys.length})
          </h4>
          <p className="text-muted-foreground mb-3 text-xs">
            Persisted only for current browser session
          </p>
          <div className="space-y-1">
            {allFlagKeys.map((flagKey) => (
              <FeatureFlagToggle key={flagKey} flagKey={flagKey} />
            ))}
          </div>
        </div>
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

        {/* Cache Stats */}
        <div>
          <h4 className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            Query Cache Stats
          </h4>
          <div className="bg-card space-y-2 rounded border p-2 text-xs">
            <div>
              Total Queries: {trpcQueryClient.getQueryCache().getAll().length}
            </div>
            <div>
              Fresh Queries:{" "}
              {
                trpcQueryClient
                  .getQueryCache()
                  .getAll()
                  .filter((q) => q.isStale() === false).length
              }
            </div>
            <div>
              Stale Queries:{" "}
              {
                trpcQueryClient
                  .getQueryCache()
                  .getAll()
                  .filter((q) => q.isStale()).length
              }
            </div>
            <div>
              Fetching:{" "}
              {
                trpcQueryClient
                  .getQueryCache()
                  .getAll()
                  .filter((q) => q.state.fetchStatus === "fetching").length
              }
            </div>
            <details className="group">
              <summary className="hover:bg-muted/50 cursor-pointer rounded p-1 font-mono text-xs">
                Cache Entries ({trpcQueryClient.getQueryCache().getAll().length}
                )
              </summary>
              <div className="mt-1 max-h-48 overflow-y-auto">
                {trpcQueryClient
                  .getQueryCache()
                  .getAll()
                  .map((query, index) => (
                    <details key={query.queryHash} className="group ml-2">
                      <summary className="hover:bg-muted/30 cursor-pointer rounded p-1 font-mono text-xs">
                        {index + 1}. {query.queryKey.join(".")}
                        <span
                          className={`ml-2 ${query.isStale() ? "text-yellow-500" : "text-green-500"}`}
                        >
                          {query.isStale() ? "●stale" : "●fresh"}
                        </span>
                        {query.state.fetchStatus === "fetching" && (
                          <span className="ml-1 text-blue-500">↻fetching</span>
                        )}
                      </summary>
                      <pre className="bg-card mt-1 max-w-full overflow-x-auto rounded border p-2 text-xs">
                        Key: {JSON.stringify(query.queryKey, null, 2)}
                        Hash: {query.queryHash}
                        DataUpdatedAt:{" "}
                        {new Date(query.state.dataUpdatedAt).toLocaleString()}
                        ErrorUpdatedAt:{" "}
                        {new Date(query.state.errorUpdatedAt).toLocaleString()}
                        Status: {query.state.status}
                      </pre>
                    </details>
                  ))}
              </div>
            </details>
          </div>
        </div>

        {/* AI Models */}
        <div>
          <h4 className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            AI Models
          </h4>
          <AiModelsTable />
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
                  (globalThis as any).queryClient = trpcQueryClient;

                  console.log("✅ Runt Debug Globals Set:");
                  console.log("📦 store  - LiveStore debug instance");
                  console.log("📋 tables - Database table definitions");
                  console.log("🔧 schema - LiveStore schema");
                  console.log("⚡ events - Event definitions");
                  console.log("🔍 queryClient - TanStack Query client");

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
                    "queryClient.getQueryCache().clear()": "Clear Query Cache",
                    "queryClient.invalidateQueries()": "Invalidate All Queries",
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                trpcQueryClient.getQueryCache().clear();
              }}
              className="w-full text-xs text-red-600 hover:bg-red-50"
            >
              Clear Query Cache
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

function AiModelsTable() {
  const { models: availableModels } = useAvailableAiModels();
  const lastUsedAiModel = useQuery(lastUsedAiModel$)?.value;
  const lastUsedAiProvider = useQuery(lastUsedAiProvider$)?.value;

  return (
    <>
      <div className="text-xs">
        <details className="group">
          <summary className="hover:bg-muted/50 cursor-pointer rounded p-1 font-mono text-xs">
            AI Models ({availableModels.length})
          </summary>
          <div className="mt-1 space-y-1">
            {availableModels.map((model, index) => (
              <div
                key={model.provider + "-" + model.name}
                className={`ml-2 flex items-center gap-1 rounded px-1 ${
                  index % 2 === 0 ? "bg-gray-100" : ""
                }`}
              >
                <div className="">
                  <div className="text-muted-foreground">{model.provider}</div>
                  <div className="font-medium">{model.name}</div>
                </div>
                {/* <pre>{JSON.stringify(model, null, 2)}</pre> */}
                <div className="flex-1" />
                {model.decomissioned && (
                  <SimpleTooltip content="This model is decomissioned and is no longer supported.">
                    <span>💀</span>
                  </SimpleTooltip>
                )}
                <AiCapabilityIcon
                  model={model}
                  capability="completion"
                  iconClassName="size-3"
                />
                <AiCapabilityIcon
                  model={model}
                  capability="vision"
                  iconClassName="size-3"
                />
                <AiCapabilityIcon
                  model={model}
                  capability="thinking"
                  iconClassName="size-3"
                />
                <AiCapabilityIcon
                  model={model}
                  capability="tools"
                  iconClassName="size-3"
                />
              </div>
            ))}
          </div>
        </details>
        <div>
          Last Used AI Model: {lastUsedAiModel}
          <br />
          Last Used AI Provider: {lastUsedAiProvider}
        </div>
      </div>
    </>
  );
}

export { DebugPanel };
