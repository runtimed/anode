import React from "react";
import { TrpcProvider } from "@/components/TrpcProvider.tsx";
import { NotebookPage as NotebookPageComponent } from "@/components/notebooks/notebook/NotebookPage";

export const NotebookPage: React.FC = () => {
  return (
    <TrpcProvider>
      <NotebookPageComponent />
    </TrpcProvider>
  );
};
