import React, { createContext, useContext } from "react";
import { useSessionStorage } from "react-use";

interface CellFilters {
  showAiCells: boolean;
  showCodeCells: boolean;
}

const DEFAULT_FILTERS: CellFilters = {
  showAiCells: true,
  showCodeCells: true,
} as const;

interface CellFilterContextType {
  filters: CellFilters;
  setShowAiCells: (value: boolean) => void;
  setShowCodeCells: (value: boolean) => void;
}

const CellFilterContext = createContext<CellFilterContextType | undefined>(
  undefined
);

interface CellFilterProviderProps {
  children: React.ReactNode;
}

export function CellFilterProvider({ children }: CellFilterProviderProps) {
  const [filters, setFilters] = useSessionStorage(
    "cell-filters",
    DEFAULT_FILTERS
  );

  const setShowAiCells = (value: boolean) => {
    setFilters({ ...filters, showAiCells: value });
  };

  const setShowCodeCells = (value: boolean) => {
    setFilters({ ...filters, showCodeCells: value });
  };

  return (
    <CellFilterContext.Provider
      value={{ filters, setShowAiCells, setShowCodeCells }}
    >
      {children}
    </CellFilterContext.Provider>
  );
}

export function useCellFilter() {
  const context = useContext(CellFilterContext);

  if (context === undefined) {
    throw new Error("useCellFilter must be used within a CellFilterProvider");
  }

  return context;
}
