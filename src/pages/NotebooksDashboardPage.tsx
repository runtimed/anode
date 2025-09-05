import React from "react";
import { TrpcProvider } from "@/components/TrpcProvider.tsx";
import { NotebookDashboard } from "@/components/notebooks/dashboard/NotebookDashboard";

export const NotebooksDashboardPage: React.FC = () => {
  return (
    <TrpcProvider>
      <NotebookDashboard />
    </TrpcProvider>
  );
};
