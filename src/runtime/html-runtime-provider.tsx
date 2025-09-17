/**
 * HTML Runtime Provider
 *
 * Provides centralized management of HTML runtime agents across the application.
 * Each notebook can have its own HTML runtime instance.
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import {
  HtmlRuntimeAgent,
  type HtmlRuntimeOptions,
} from "./html-runtime-agent.js";
import { useAuth } from "../auth/index.js";

export interface HtmlRuntimeState {
  agent: HtmlRuntimeAgent | null;
  isActive: boolean;
  isStarting: boolean;
  isStopping: boolean;
  error: string | null;
  runtimeId: string | null;
  sessionId: string | null;
}

export interface HtmlRuntimeContextType {
  /** Get runtime state for a specific notebook */
  getRuntimeState: (notebookId: string) => HtmlRuntimeState;
  /** Start HTML runtime for a notebook */
  startRuntime: (
    notebookId: string,
    options?: Partial<HtmlRuntimeOptions>
  ) => Promise<void>;
  /** Stop HTML runtime for a notebook */
  stopRuntime: (notebookId: string) => Promise<void>;
  /** Restart HTML runtime for a notebook */
  restartRuntime: (notebookId: string) => Promise<void>;
  /** Get all active runtimes */
  getActiveRuntimes: () => Map<string, HtmlRuntimeState>;
  /** Check if any runtime is active */
  hasActiveRuntimes: () => boolean;
}

const HtmlRuntimeContext = createContext<HtmlRuntimeContextType | undefined>(
  undefined
);

const DEFAULT_RUNTIME_STATE: HtmlRuntimeState = {
  agent: null,
  isActive: false,
  isStarting: false,
  isStopping: false,
  error: null,
  runtimeId: null,
  sessionId: null,
};

export interface HtmlRuntimeProviderProps {
  children: ReactNode;
}

export const HtmlRuntimeProvider: React.FC<HtmlRuntimeProviderProps> = ({
  children,
}) => {
  const auth = useAuth();

  // Track runtime states by notebook ID
  const [runtimeStates, setRuntimeStates] = useState<
    Map<string, HtmlRuntimeState>
  >(new Map());

  // Keep references to runtime agents for cleanup
  const runtimeAgents = useRef<Map<string, HtmlRuntimeAgent>>(new Map());

  const updateRuntimeState = useCallback(
    (notebookId: string, updates: Partial<HtmlRuntimeState>) => {
      setRuntimeStates((prev) => {
        const newStates = new Map(prev);
        const currentState = newStates.get(notebookId) || {
          ...DEFAULT_RUNTIME_STATE,
        };
        newStates.set(notebookId, { ...currentState, ...updates });
        return newStates;
      });
    },
    []
  );

  const getRuntimeState = useCallback(
    (notebookId: string): HtmlRuntimeState => {
      return runtimeStates.get(notebookId) || { ...DEFAULT_RUNTIME_STATE };
    },
    [runtimeStates]
  );

  const startRuntime = useCallback(
    async (notebookId: string, options: Partial<HtmlRuntimeOptions> = {}) => {
      if (!auth.isAuthenticated) {
        updateRuntimeState(notebookId, { error: "Not authenticated" });
        return;
      }

      const currentState = getRuntimeState(notebookId);
      if (currentState.isActive || currentState.isStarting) {
        return;
      }

      updateRuntimeState(notebookId, {
        isStarting: true,
        error: null,
      });

      try {
        const runtimeOptions: HtmlRuntimeOptions = {
          notebookId,
          authToken: auth.accessToken!,
          autoStart: false,
          ...options,
        };

        const agent = new HtmlRuntimeAgent(runtimeOptions);
        await agent.start();

        const status = agent.getStatus();

        // Store agent reference for cleanup
        runtimeAgents.current.set(notebookId, agent);

        updateRuntimeState(notebookId, {
          agent,
          isActive: true,
          isStarting: false,
          runtimeId: status.runtimeId,
          sessionId: status.sessionId,
          error: null,
        });

        console.log("✅ HTML Runtime started for notebook:", notebookId);
      } catch (error) {
        console.error("❌ Failed to start HTML Runtime:", error);

        updateRuntimeState(notebookId, {
          agent: null,
          isActive: false,
          isStarting: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [auth.isAuthenticated, getRuntimeState, updateRuntimeState]
  );

  const stopRuntime = useCallback(
    async (notebookId: string) => {
      const currentState = getRuntimeState(notebookId);

      if (!currentState.isActive || currentState.isStopping) {
        return;
      }

      updateRuntimeState(notebookId, {
        isStopping: true,
        error: null,
      });

      try {
        const agent = runtimeAgents.current.get(notebookId);
        if (agent) {
          await agent.stop();
          runtimeAgents.current.delete(notebookId);
        }

        updateRuntimeState(notebookId, {
          agent: null,
          isActive: false,
          isStopping: false,
          runtimeId: null,
          sessionId: null,
          error: null,
        });

        console.log("🛑 HTML Runtime stopped for notebook:", notebookId);
      } catch (error) {
        console.error("❌ Failed to stop HTML Runtime:", error);

        updateRuntimeState(notebookId, {
          isStopping: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [getRuntimeState, updateRuntimeState]
  );

  const restartRuntime = useCallback(
    async (notebookId: string) => {
      await stopRuntime(notebookId);
      // Small delay to ensure cleanup
      await new Promise((resolve) => setTimeout(resolve, 100));
      await startRuntime(notebookId);
    },
    [stopRuntime, startRuntime]
  );

  const getActiveRuntimes = useCallback(() => {
    const activeRuntimes = new Map<string, HtmlRuntimeState>();

    for (const [notebookId, state] of runtimeStates.entries()) {
      if (state.isActive) {
        activeRuntimes.set(notebookId, state);
      }
    }

    return activeRuntimes;
  }, [runtimeStates]);

  const hasActiveRuntimes = useCallback(() => {
    return Array.from(runtimeStates.values()).some((state) => state.isActive);
  }, [runtimeStates]);

  // Cleanup all runtimes on unmount
  useEffect(() => {
    const agentsRef = runtimeAgents.current;
    return () => {
      const agents = Array.from(agentsRef.values());
      agents.forEach((agent) => {
        agent.stop().catch(console.error);
      });
      agentsRef.clear();
    };
  }, []);

  // Handle auth changes - stop all runtimes if user logs out
  useEffect(() => {
    if (!auth.isAuthenticated && hasActiveRuntimes()) {
      console.log("🔐 User logged out, stopping all HTML runtimes");

      const activeNotebooks = Array.from(runtimeStates.entries())
        .filter(([_, state]) => state.isActive)
        .map(([notebookId]) => notebookId);

      activeNotebooks.forEach((notebookId) => {
        stopRuntime(notebookId).catch(console.error);
      });
    }
  }, [auth.isAuthenticated, hasActiveRuntimes, runtimeStates, stopRuntime]);

  const contextValue: HtmlRuntimeContextType = {
    getRuntimeState,
    startRuntime,
    stopRuntime,
    restartRuntime,
    getActiveRuntimes,
    hasActiveRuntimes,
  };

  return (
    <HtmlRuntimeContext.Provider value={contextValue}>
      {children}
    </HtmlRuntimeContext.Provider>
  );
};

/**
 * Hook to use the HTML Runtime context
 */
export const useHtmlRuntimeContext = (): HtmlRuntimeContextType => {
  const context = useContext(HtmlRuntimeContext);
  if (!context) {
    throw new Error(
      "useHtmlRuntimeContext must be used within an HtmlRuntimeProvider"
    );
  }
  return context;
};

/**
 * Hook for managing a specific notebook's HTML runtime
 */
export const useNotebookHtmlRuntime = (notebookId: string) => {
  const context = useHtmlRuntimeContext();

  const state = context.getRuntimeState(notebookId);

  const start = useCallback(
    async (options?: Partial<HtmlRuntimeOptions>) => {
      await context.startRuntime(notebookId, options);
    },
    [context, notebookId]
  );

  const stop = useCallback(async () => {
    await context.stopRuntime(notebookId);
  }, [context, notebookId]);

  const restart = useCallback(async () => {
    await context.restartRuntime(notebookId);
  }, [context, notebookId]);

  return {
    state,
    start,
    stop,
    restart,
  };
};

export default HtmlRuntimeProvider;
