/**
 * Runtime Registry Wrapper
 *
 * Drop-in replacement for HtmlRuntimeManager that uses the new runtime registry system.
 * Provides backwards compatibility while enabling the new registry-based architecture.
 */

import React, { useEffect, useState, ReactNode } from "react";
import { useStore } from "@livestore/react";
import { useAuth, useAuthenticatedUser } from "../../auth/index.js";
import { LoadingState } from "../../components/loading/LoadingState.js";
import {
  RuntimeRegistryProvider,
  createRuntimeFactory,
  type RuntimeFactory,
} from "./index.js";

interface RuntimeRegistryWrapperProps {
  notebookId: string;
  children: ReactNode;
}

export const RuntimeRegistryWrapper: React.FC<RuntimeRegistryWrapperProps> = ({
  notebookId,
  children,
}) => {
  const { store } = useStore();
  const { isAuthenticated } = useAuth();
  const userId = useAuthenticatedUser();
  const [runtimeFactory, setRuntimeFactory] = useState<RuntimeFactory | null>(
    null
  );
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    if (!store || !isAuthenticated || !userId) {
      console.log("⏳ Waiting for store and authentication...");
      setRuntimeFactory(null);
      return;
    }

    // Only initialize if we don't already have a factory
    if (runtimeFactory) {
      console.log("ℹ️ Runtime registry already initialized, skipping");
      return;
    }

    console.log("🏭 Initializing runtime registry for notebook", notebookId);

    try {
      const factory = createRuntimeFactory({
        store,
        userId,
        registryConfig: {
          maxConcurrentRuntimes: 1, // Follow "one runtime per notebook" constraint
          allowMultipleRuntimesOfSameType: false,
          defaultRuntimeType: "html",
        },
      });

      setRuntimeFactory(factory);
      setInitError(null);
      console.log("✅ Runtime registry initialized successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("❌ Failed to initialize runtime registry:", error);
      setInitError(errorMessage);
      setRuntimeFactory(null);
    }
  }, [store, isAuthenticated, userId, notebookId, runtimeFactory]);

  // Show loading state while initializing
  if (!store || !isAuthenticated || !userId) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingState message="Waiting for authentication..." />
      </div>
    );
  }

  if (initError) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="text-sm font-medium text-red-600">
            Runtime System Error
          </div>
          <div className="mt-1 text-xs text-gray-500">{initError}</div>
        </div>
      </div>
    );
  }

  if (!runtimeFactory) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingState message="Initializing runtime system..." />
      </div>
    );
  }

  return (
    <RuntimeRegistryProvider
      config={{
        maxConcurrentRuntimes: 1,
        allowMultipleRuntimesOfSameType: false,
        defaultRuntimeType: "html",
      }}
    >
      {children}
    </RuntimeRegistryProvider>
  );
};

/**
 * Backwards compatible export using the same name as the old manager
 */
export const HtmlRuntimeManagerV2 = RuntimeRegistryWrapper;
