import { useState, useEffect } from "react";
import { useStore, useQuery } from "@livestore/react";
import { queryDb } from "@livestore/livestore";
import { events, tables } from "@runt/schema";
import { useCurrentUser } from "./useCurrentUser";

export interface ToolApprovalRequest {
  toolCallId: string;
  cellId: string;
  toolName: string;
  arguments: Record<string, unknown>;
  requestedAt: Date;
}

export const useToolApprovals = () => {
  const { store } = useStore();
  const currentUser = useCurrentUser();
  const [pendingApprovals, setPendingApprovals] = useState<ToolApprovalRequest[]>([]);

  // Query for pending tool approvals
  const approvals = useQuery(
    queryDb(tables.toolApprovals.select().where({ status: "pending" }))
  );

  // Update pending approvals when query results change
  useEffect(() => {
    const pending = approvals.map(approval => ({
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
        approvedBy: currentUser.id,
        respondedAt: new Date(),
      })
    );
  };

  return {
    pendingApprovals,
    respondToApproval,
  };
}; 