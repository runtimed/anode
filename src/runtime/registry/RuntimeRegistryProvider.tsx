/**
 * Runtime Registry Provider
 *
 * React context provider for the runtime registry system.
 * Provides hooks for components to interact with runtimes.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
  useRef,
} from "react";
import { RuntimeRegistry } from "./RuntimeRegistry.js";
import type {
  Runtime,
  RuntimeState,
  RuntimeType,
  RuntimeRegistryConfig,
} from "./types.js";

interface RuntimeRegistryContextType {
  registry: RuntimeRegistry;
  availableRuntimes: Runtime[];
  activeRuntimes: Runtime[];
  activeRuntime: Runtime | undefined;

  // Registry operations
  startRuntime: (runtimeId: string, notebookId: string) => Promise<void>;
  stopRuntime: (runtimeId: string) => Promise<void>;
  stopAllRuntimes: () => Promise<void>;

  // Runtime queries
  getRuntime: (runtimeId: string) => Runtime | undefined;
  getRuntimesByType: (type: RuntimeType) => Runtime[];
  getActiveRuntimeOfType: (type: RuntimeType) => Runtime | undefined;

  // State queries
  canStartRuntime: () => boolean;

  // Event handlers
  onRuntimeStateChanged: (
    callback: (runtime: Runtime, state: RuntimeState) => void
  ) => () => void;
}

const RuntimeRegistryContext = createContext<RuntimeRegistryContextType | null>(
  null
);

interface RuntimeRegistryProviderProps {
  children: ReactNode;
  config?: RuntimeRegistryConfig;
}

export const RuntimeRegistryProvider: React.FC<
  RuntimeRegistryProviderProps
> = ({ children, config }) => {
  const initializationRef = useRef(false);
  const [registry] = useState(() => {
    // Prevent double initialization in React StrictMode
    if (initializationRef.current) {
      console.log("ℹ️ Registry already initialized, reusing instance");
      return RuntimeRegistry.getInstance();
    }
    initializationRef.current = true;
    return RuntimeRegistry.getInstance(config);
  });
  const [availableRuntimes, setAvailableRuntimes] = useState<Runtime[]>([]);
  const [activeRuntimes, setActiveRuntimes] = useState<Runtime[]>([]);
  const [activeRuntime, setActiveRuntime] = useState<Runtime | undefined>();

  // Update state when registry changes
  const updateRegistryState = useCallback(() => {
    setAvailableRuntimes(registry.getAvailableRuntimes());
    setActiveRuntimes(registry.getActiveRuntimes());
    setActiveRuntime(registry.getActiveRuntime());
  }, [registry]);

  // Set up registry event listeners
  useEffect(() => {
    // Initial state update
    updateRegistryState();

    // Listen for registry changes
    const unsubscribeStateChanged = registry.onRuntimeStateChanged(() => {
      updateRegistryState();
    });

    const unsubscribeRegistered = registry.onRuntimeRegistered(() => {
      updateRegistryState();
    });

    const unsubscribeUnregistered = registry.onRuntimeUnregistered(() => {
      updateRegistryState();
    });

    // Cleanup on unmount
    return () => {
      unsubscribeStateChanged();
      unsubscribeRegistered();
      unsubscribeUnregistered();
    };
  }, [registry, updateRegistryState]);

  // Registry operations
  const startRuntime = useCallback(
    async (runtimeId: string, notebookId: string) => {
      await registry.startRuntime(runtimeId, notebookId);
    },
    [registry]
  );

  const stopRuntime = useCallback(
    async (runtimeId: string) => {
      const runtime = registry.getRuntime(runtimeId);
      if (runtime) {
        await runtime.stop();
      }
    },
    [registry]
  );

  const stopAllRuntimes = useCallback(async () => {
    await registry.stopAllRuntimes();
  }, [registry]);

  // Runtime queries
  const getRuntime = useCallback(
    (runtimeId: string) => {
      return registry.getRuntime(runtimeId);
    },
    [registry]
  );

  const getRuntimesByType = useCallback(
    (type: RuntimeType) => {
      return registry.getRuntimesByType(type);
    },
    [registry]
  );

  const getActiveRuntimeOfType = useCallback(
    (type: RuntimeType) => {
      return registry.getActiveRuntimeOfType(type);
    },
    [registry]
  );

  // State queries
  const canStartRuntime = useCallback(() => {
    return registry.canStartRuntime();
  }, [registry]);

  // Event handlers
  const onRuntimeStateChanged = useCallback(
    (callback: (runtime: Runtime, state: RuntimeState) => void) => {
      return registry.onRuntimeStateChanged(callback);
    },
    [registry]
  );

  const contextValue: RuntimeRegistryContextType = {
    registry,
    availableRuntimes,
    activeRuntimes,
    activeRuntime,
    startRuntime,
    stopRuntime,
    stopAllRuntimes,
    getRuntime,
    getRuntimesByType,
    getActiveRuntimeOfType,
    canStartRuntime,
    onRuntimeStateChanged,
  };

  return (
    <RuntimeRegistryContext.Provider value={contextValue}>
      {children}
    </RuntimeRegistryContext.Provider>
  );
};

/**
 * Hook to access the runtime registry
 */
export const useRuntimeRegistry = (): RuntimeRegistryContextType => {
  const context = useContext(RuntimeRegistryContext);
  if (!context) {
    throw new Error(
      "useRuntimeRegistry must be used within RuntimeRegistryProvider"
    );
  }
  return context;
};

/**
 * Hook to get the state of a specific runtime
 */
export const useRuntimeState = (runtimeId: string): RuntimeState | null => {
  const { getRuntime } = useRuntimeRegistry();
  const [state, setState] = useState<RuntimeState | null>(null);

  useEffect(() => {
    const runtime = getRuntime(runtimeId);
    if (!runtime) {
      setState(null);
      return;
    }

    // Initial state
    setState(runtime.getState());

    // Listen for state changes
    const unsubscribe =
      (runtime as any).onStateChange?.(setState) ?? (() => {});

    return unsubscribe;
  }, [runtimeId, getRuntime]);

  return state;
};

/**
 * Hook to get runtimes by type with reactive updates
 */
export const useRuntimesByType = (type: RuntimeType): Runtime[] => {
  const { getRuntimesByType } = useRuntimeRegistry();

  return React.useMemo(() => {
    return getRuntimesByType(type);
  }, [type, getRuntimesByType]);
};

/**
 * Hook to get the active runtime of a specific type
 */
export const useActiveRuntimeOfType = (
  type: RuntimeType
): Runtime | undefined => {
  const { getActiveRuntimeOfType } = useRuntimeRegistry();

  return React.useMemo(() => {
    return getActiveRuntimeOfType(type);
  }, [type, getActiveRuntimeOfType]);
};

/**
 * Hook for runtime operations with error handling
 */
export const useRuntimeOperations = () => {
  const { startRuntime, stopRuntime, stopAllRuntimes } = useRuntimeRegistry();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const safeStartRuntime = useCallback(
    async (runtimeId: string, notebookId: string) => {
      setIsLoading(true);
      setError(null);

      try {
        await startRuntime(runtimeId, notebookId);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        console.error("Failed to start runtime:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [startRuntime]
  );

  const safeStopRuntime = useCallback(
    async (runtimeId: string) => {
      setIsLoading(true);
      setError(null);

      try {
        await stopRuntime(runtimeId);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        console.error("Failed to stop runtime:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [stopRuntime]
  );

  const safeStopAllRuntimes = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await stopAllRuntimes();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      console.error("Failed to stop all runtimes:", err);
    } finally {
      setIsLoading(false);
    }
  }, [stopAllRuntimes]);

  return {
    startRuntime: safeStartRuntime,
    stopRuntime: safeStopRuntime,
    stopAllRuntimes: safeStopAllRuntimes,
    isLoading,
    error,
    clearError: () => setError(null),
  };
};
