import { useQuery } from "@livestore/react";
import { queryDb } from "@livestore/livestore";
import { RuntimeSessionData, tables } from "@runt/schema";
import { useCallback } from "react";

export type RuntimeHealth =
  | "healthy"
  | "warning"
  | "connecting"
  | "disconnected"
  | "unknown";

export type RuntimeHealthState = {
  activeRuntime: RuntimeSessionData | undefined;
  hasActiveRuntime: boolean;
  runtimeHealth: RuntimeHealth;
  runtimeStatus: string;
  runningExecutions: any[];
  executionQueue: any[];
};

export const useRuntimeHealth = (): RuntimeHealthState => {
  const runtimeSessions = useQuery(
    queryDb(tables.runtimeSessions.select().where({ isActive: true }))
  );

  // Get execution queue for runtime health monitoring
  const executionQueue = useQuery(
    queryDb(tables.executionQueue.select().orderBy("id", "desc"))
  ) as any[];

  // Get running executions with SQL filtering for better performance
  const runningExecutions = useQuery(
    queryDb(
      tables.executionQueue
        .select()
        .where({
          status: { op: "IN", value: ["executing", "pending", "assigned"] },
        })
        .orderBy("id", "desc")
    )
  ) as any[];

  // Check runtime status
  const getRuntimeHealth = useCallback(
    (session: RuntimeSessionData): RuntimeHealth => {
      if (session.status === "starting") {
        // If session is starting, it's connecting
        return session.isActive ? "connecting" : "unknown";
      }
      if (!session.isActive) {
        return "disconnected";
      }
      // For active sessions, use status to determine health
      switch (session.status) {
        case "ready":
        case "busy":
          return "healthy";
        case "restarting":
          return "warning";
        case "terminated":
          return "disconnected";
        default:
          return "unknown";
      }
    },
    []
  );

  const activeRuntime = runtimeSessions.find(
    (session: RuntimeSessionData) =>
      session.status === "ready" || session.status === "busy"
  );

  const hasActiveRuntime = Boolean(
    activeRuntime &&
      ["healthy", "warning", "connecting"].includes(
        getRuntimeHealth(activeRuntime)
      )
  );

  const runtimeHealth = activeRuntime
    ? getRuntimeHealth(activeRuntime)
    : "disconnected";

  const runtimeStatus =
    activeRuntime?.status ||
    (runtimeSessions.length > 0 ? runtimeSessions[0].status : "disconnected");

  return {
    activeRuntime,
    hasActiveRuntime,
    runtimeHealth,
    runtimeStatus,
    runningExecutions,
    executionQueue,
  };
};
