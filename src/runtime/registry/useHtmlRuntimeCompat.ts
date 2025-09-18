/**
 * HTML Runtime Compatibility Hook
 *
 * Provides backwards compatibility with the old useHtmlRuntime hook interface
 * while using the new runtime registry system underneath.
 */

import { useMemo } from "react";
import {
  useRuntimeRegistry,
  useRuntimeOperations,
} from "./RuntimeRegistryProvider.js";
// RuntimeState import removed - not needed for compatibility interface

// Legacy interface for backwards compatibility
export interface HtmlRuntimeState {
  isActive: boolean;
  isStarting: boolean;
  isStopping: boolean;
  error: string | null;
  runtimeId: string | null;
  sessionId: string | null;
}

export interface HtmlRuntimeContextType {
  runtimeState: HtmlRuntimeState;
  startRuntime: () => Promise<void>;
  stopRuntime: () => Promise<void>;
  restartRuntime: () => Promise<void>;
}

/**
 * Backwards compatible hook for HTML runtime management
 */
export const useHtmlRuntime = (): HtmlRuntimeContextType => {
  const { getRuntime } = useRuntimeRegistry();
  const { stopRuntime } = useRuntimeOperations();

  // Get the HTML runtime instance
  const htmlRuntime = useMemo(() => {
    return getRuntime("html-runtime") || null;
  }, [getRuntime]);

  // Map new runtime state to legacy format
  const runtimeState: HtmlRuntimeState = useMemo(() => {
    if (!htmlRuntime) {
      return {
        isActive: false,
        isStarting: false,
        isStopping: false,
        error: "HTML runtime not available",
        runtimeId: null,
        sessionId: null,
      };
    }

    const state = htmlRuntime.getState();

    return {
      isActive: state.isActive,
      isStarting: state.isStarting,
      isStopping: state.isStopping,
      error: state.error,
      runtimeId: state.runtimeId,
      sessionId: state.sessionId,
    };
  }, [htmlRuntime]);

  // Provide legacy API methods
  const handleStartRuntime = async () => {
    if (!htmlRuntime) {
      throw new Error("HTML runtime not available");
    }

    // Legacy interface doesn't provide notebook ID context
    throw new Error(
      "Cannot start runtime: notebook ID required. Use RuntimeRegistryProvider or useHtmlRuntimeWithNotebook."
    );
  };

  const handleStopRuntime = async () => {
    if (!htmlRuntime) {
      console.warn("HTML runtime not available for stopping");
      return;
    }

    await stopRuntime("html-runtime");
  };

  const handleRestartRuntime = async () => {
    if (!htmlRuntime) {
      throw new Error("HTML runtime not available");
    }

    await htmlRuntime.restart();
  };

  return {
    runtimeState,
    startRuntime: handleStartRuntime,
    stopRuntime: handleStopRuntime,
    restartRuntime: handleRestartRuntime,
  };
};

/**
 * Enhanced compatibility hook that includes notebook context
 */
export const useHtmlRuntimeWithNotebook = (
  notebookId: string
): HtmlRuntimeContextType => {
  const { getRuntime } = useRuntimeRegistry();
  const { startRuntime, stopRuntime } = useRuntimeOperations();

  // Get the HTML runtime instance
  const htmlRuntime = useMemo(() => {
    return getRuntime("html-runtime") || null;
  }, [getRuntime]);

  // Map new runtime state to legacy format
  const runtimeState: HtmlRuntimeState = useMemo(() => {
    if (!htmlRuntime) {
      return {
        isActive: false,
        isStarting: false,
        isStopping: false,
        error: "HTML runtime not available",
        runtimeId: null,
        sessionId: null,
      };
    }

    const state = htmlRuntime.getState();

    return {
      isActive: state.isActive,
      isStarting: state.isStarting,
      isStopping: state.isStopping,
      error: state.error,
      runtimeId: state.runtimeId,
      sessionId: state.sessionId,
    };
  }, [htmlRuntime]);

  // Provide legacy API methods with notebook context
  const handleStartRuntime = async () => {
    if (!htmlRuntime) {
      throw new Error("HTML runtime not available");
    }

    await startRuntime("html-runtime", notebookId);
  };

  const handleStopRuntime = async () => {
    if (!htmlRuntime) {
      console.warn("HTML runtime not available for stopping");
      return;
    }

    await stopRuntime("html-runtime");
  };

  const handleRestartRuntime = async () => {
    if (!htmlRuntime) {
      throw new Error("HTML runtime not available");
    }

    await htmlRuntime.restart();
  };

  return {
    runtimeState,
    startRuntime: handleStartRuntime,
    stopRuntime: handleStopRuntime,
    restartRuntime: handleRestartRuntime,
  };
};
