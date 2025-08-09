import React, { createContext, useContext, ReactNode } from "react";

// Cell creation function type
export type AddCellFunction = (
  cellId?: string,
  cellType?: "code" | "markdown" | "sql" | "ai",
  position?: "before" | "after"
) => void;

interface NotebookContextType {
  addCell: AddCellFunction;
}

const NotebookContext = createContext<NotebookContextType | null>(null);

interface NotebookProviderProps {
  children: ReactNode;
  addCell: AddCellFunction;
}

export const NotebookProvider: React.FC<NotebookProviderProps> = ({
  children,
  addCell,
}) => {
  return (
    <NotebookContext.Provider value={{ addCell }}>
      {children}
    </NotebookContext.Provider>
  );
};

export const useNotebookContext = () => {
  const context = useContext(NotebookContext);
  if (!context) {
    throw new Error(
      "useNotebookContext must be used within a NotebookProvider"
    );
  }
  return context;
};
