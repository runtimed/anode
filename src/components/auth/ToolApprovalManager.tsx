import React from "react";
import { useToolApprovals } from "../../hooks/useToolApprovals";
import { ToolApprovalDialog } from "./ToolApprovalDialog";

export const ToolApprovalManager: React.FC = () => {
  const { pendingApprovals, respondToApproval } = useToolApprovals(); // No cellId filter for global manager

  // Show the first pending approval if any exist
  const currentRequest = pendingApprovals[0];

  if (!currentRequest) {
    return null;
  }

  const handleApproval = (
    status: "approved_once" | "approved_always" | "denied"
  ) => {
    respondToApproval(currentRequest.toolCallId, status);
  };

  return (
    <ToolApprovalDialog request={currentRequest} onApprove={handleApproval} />
  );
};
