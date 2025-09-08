import { useState, useEffect } from "react";
import { useStore, useQuery } from "@livestore/react";
import { queryDb } from "@livestore/livestore";
import { events, tables } from "@/schema";
import { useAuthenticatedUser } from "../auth/index.js";

export type ToolApprovalRequest = {
  toolCallId: string;
  cellId: string;
  toolName: string;
  arguments: Record<string, unknown>;
  requestedAt: Date;
};

interface UseToolApprovalsOptions {
  cellId?: string; // Optional filter for specific cell
}

export const useToolApprovals = (options: UseToolApprovalsOptions = {}) => {
  const { store } = useStore();
  const currentUser = useAuthenticatedUser();
  const [pendingApprovals, setPendingApprovals] = useState<
    ToolApprovalRequest[]
  >([]);

  // Create query with optional cellId filter
  const query = options.cellId
    ? queryDb(
        tables.toolApprovals.select().where({
          status: "pending" as const,
          cellId: options.cellId,
        })
      )
    : queryDb(
        tables.toolApprovals.select().where({
          status: "pending" as const,
        })
      );

  // Query for pending tool approvals
  const approvals = useQuery(query);

  // Update pending approvals when query results change
  useEffect(() => {
    const pending = approvals.map((approval) => ({
      toolCallId: approval.toolCallId,
      cellId: approval.cellId,
      toolName: approval.toolName,
      arguments: {}, // We could store arguments in the approval table if needed
      requestedAt: approval.requestedAt,
    }));
    setPendingApprovals(pending);
  }, [approvals]);

  const respondToApproval = (
    toolCallId: string,
    status: "approved_once" | "approved_always" | "denied"
  ) => {
    store.commit(
      events.toolApprovalResponded({
        toolCallId,
        status,
        approvedBy: currentUser,
        respondedAt: new Date(),
      })
    );
  };

  return {
    pendingApprovals,
    respondToApproval,
    // Helper to get the first pending approval for this cell
    currentApprovalRequest: pendingApprovals[0] || null,
    // Helper to check if there are pending approvals
    hasPendingApprovals: pendingApprovals.length > 0,
  };
};
