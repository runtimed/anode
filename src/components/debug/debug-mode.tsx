import { createContext, useContext, ReactNode } from "react";
import { useLocalStorage } from "react-use";

export interface DebugState {
  enabled: boolean;
}

const defaultDebugState: DebugState = {
  enabled: false,
};

interface DebugContextType {
  debugState: DebugState;
  setDebugState: (
    state: DebugState | ((prev: DebugState) => DebugState)
  ) => void;
}

const DebugContext = createContext<DebugContextType | undefined>(undefined);

interface DebugProviderProps {
  children: ReactNode;
  storageKey?: string;
}

export function DebugProvider({
  children,
  storageKey = "anode-debug-state",
}: DebugProviderProps) {
  const [debugState, setDebugState] = useLocalStorage<DebugState>(
    storageKey,
    defaultDebugState
  );

  const contextValue: DebugContextType = {
    debugState: debugState || defaultDebugState,
    setDebugState: (state) => {
      if (typeof state === "function") {
        setDebugState((prev) => state(prev || defaultDebugState));
      } else {
        setDebugState(state);
      }
    },
  };

  return (
    <DebugContext.Provider value={contextValue}>
      {children}
    </DebugContext.Provider>
  );
}

export function useDebug() {
  const context = useContext(DebugContext);

  if (context === undefined) {
    throw new Error("useDebug must be used within a DebugProvider");
  }

  return {
    enabled: context.debugState.enabled,
    setEnabled: (enabled: boolean) => {
      context.setDebugState({
        ...context.debugState,
        enabled,
      });
    },
  };
}
