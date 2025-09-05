import React from "react";
import { TrpcProvider } from "@/components/TrpcProvider.tsx";
import { NotebookApp } from "@/components/notebook/NotebookApp";

export const NotebookPage: React.FC = () => {
  return (
    <TrpcProvider>
      <NotebookApp />
    </TrpcProvider>
  );
};
