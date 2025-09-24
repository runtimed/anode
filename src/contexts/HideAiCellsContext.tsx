import React, { createContext, useContext, ReactNode } from "react";
import { useLocalStorage } from "react-use";

interface HideAiCellsContextType {
  hideAiCells: boolean;
  toggleHideAiCells: () => void;
  setHideAiCells: (value: boolean) => void;
}

const HideAiCellsContext = createContext<HideAiCellsContextType | undefined>(
  undefined
);

interface HideAiCellsProviderProps {
  children: ReactNode;
}

export const HideAiCellsProvider: React.FC<HideAiCellsProviderProps> = ({
  children,
}) => {
  const [hideAiCells, setHideAiCells] = useLocalStorage("hideAiCells", false);

  const toggleHideAiCells = () => {
    setHideAiCells(!hideAiCells);
  };

  const contextValue: HideAiCellsContextType = {
    hideAiCells: hideAiCells ?? false,
    toggleHideAiCells,
    setHideAiCells: (value: boolean) => setHideAiCells(value),
  };

  return (
    <HideAiCellsContext.Provider value={contextValue}>
      {children}
    </HideAiCellsContext.Provider>
  );
};

export const useHideAiCellsContext = (): HideAiCellsContextType => {
  const context = useContext(HideAiCellsContext);
  if (context === undefined) {
    throw new Error(
      "useHideAiCellsContext must be used within a HideAiCellsProvider"
    );
  }
  return context;
};
