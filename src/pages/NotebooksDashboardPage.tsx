import React from "react";
import { TrpcProvider } from "../components/TrpcProvider.tsx";
import { NotebookDashboard } from "../components/notebooks/NotebookDashboard.tsx";

export const NotebooksDashboardPage: React.FC = () => {
  return (
    <TrpcProvider>
      <NotebookDashboard />
    </TrpcProvider>
  );
};
