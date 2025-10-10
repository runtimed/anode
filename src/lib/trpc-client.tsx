import { QueryClient, useMutation } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { useAuth } from "@/auth";
import { useMemo } from "react";

import type { AppRouter } from "../../backend/trpc/index";
//     👆 **type-only** import

// IndexedDB cache persistence for fast initial loads
const CACHE_DB_NAME = "runt-query-cache";
const CACHE_DB_VERSION = 1;
const CACHE_STORE_NAME = "query-data";

type CacheEntry = {
  queryKey: string;
  data: any;
  timestamp: number;
  staleTime: number;
};

class QueryCachePersistence {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (!("indexedDB" in window)) {
      console.warn("IndexedDB not available, cache persistence disabled");
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(CACHE_DB_NAME, CACHE_DB_VERSION);

      request.onerror = () => {
        console.warn("Failed to open cache database:", request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
          const store = db.createObjectStore(CACHE_STORE_NAME, {
            keyPath: "queryKey",
          });
          store.createIndex("timestamp", "timestamp", { unique: false });
        }
      };
    });
  }

  async set(queryKeyStr: string, data: any, staleTime: number): Promise<void> {
    if (!this.db) return;

    // Only persist critical queries for fast initial loads
    if (!this.shouldPersist(queryKeyStr)) return;

    try {
      const transaction = this.db.transaction([CACHE_STORE_NAME], "readwrite");
      const store = transaction.objectStore(CACHE_STORE_NAME);

      const entry: CacheEntry = {
        queryKey: queryKeyStr,
        data,
        timestamp: Date.now(),
        staleTime,
      };

      store.put(entry);
    } catch (error) {
      console.warn("Failed to persist query cache:", error);
    }
  }

  async get(queryKeyStr: string): Promise<any | null> {
    if (!this.db) return null;

    try {
      const transaction = this.db.transaction([CACHE_STORE_NAME], "readonly");
      const store = transaction.objectStore(CACHE_STORE_NAME);

      return new Promise((resolve) => {
        const request = store.get(queryKeyStr);
        request.onsuccess = () => {
          const entry = request.result as CacheEntry | undefined;
          if (!entry) {
            resolve(null);
            return;
          }

          // Always return cached data for initial load - freshness checked by React Query
          resolve(entry.data);
        };
        request.onerror = () => resolve(null);
      });
    } catch (error) {
      console.warn("Failed to retrieve query cache:", error);
      return null;
    }
  }

  private shouldPersist(queryKeyStr: string): boolean {
    // Persist queries that benefit from fast initial loads
    return (
      queryKeyStr.includes("notebooks") ||
      queryKeyStr.includes("tags") ||
      queryKeyStr.includes("me")
    );
  }

  async clear(): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction([CACHE_STORE_NAME], "readwrite");
      const store = transaction.objectStore(CACHE_STORE_NAME);
      store.clear();
    } catch (error) {
      console.warn("Failed to clear query cache:", error);
    }
  }

  async delete(queryKeyStr: string): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction([CACHE_STORE_NAME], "readwrite");
      const store = transaction.objectStore(CACHE_STORE_NAME);
      store.delete(queryKeyStr);
    } catch (error) {
      console.warn("Failed to delete query cache entry:", error);
    }
  }

  async deleteByPattern(pattern: string): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction([CACHE_STORE_NAME], "readwrite");
      const store = transaction.objectStore(CACHE_STORE_NAME);

      const request = store.getAll();
      request.onsuccess = () => {
        const entries = request.result as CacheEntry[];
        entries.forEach((entry) => {
          if (entry.queryKey.includes(pattern)) {
            store.delete(entry.queryKey);
          }
        });
      };
    } catch (error) {
      console.warn("Failed to delete cache entries by pattern:", error);
    }
  }
}

const cachePersistence = new QueryCachePersistence();

// Initialize persistence (non-blocking)
cachePersistence.init().catch(() => {
  // Silently fail - cache persistence is optional
});

const TRPC_ENDPOINT = "/api/trpc";

export const trpcQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache-and-refresh strategy: reasonable cache time, short stale time
      gcTime: 1000 * 60 * 5, // Keep in memory for 5 minutes
      staleTime: 1000 * 10, // Consider stale after 10 seconds, triggers background refresh
      // Retry failed requests
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Enable background refetch when window regains focus
      refetchOnWindowFocus: true,
      // Enable background refetch on reconnect
      refetchOnReconnect: true,
      // Don't refetch on mount if we have cached data (let stale time handle freshness)
      refetchOnMount: "always",
      // Custom meta to identify cacheable queries
      meta: {
        cacheable: true,
      },
    },
  },
});

// Add cache persistence hooks for fast initial loads
trpcQueryClient.getQueryCache().subscribe((event) => {
  if (event.type === "added" || event.type === "updated") {
    const { query } = event;
    if (query.state.status === "success" && query.state.data) {
      // Persist successful queries with their stale time
      const staleTime = (query.options as any).staleTime || 0;
      cachePersistence.set(
        JSON.stringify(query.queryKey),
        query.state.data,
        staleTime
      );
    }
  }
});

// Restore cached data on client initialization for fast initial loads
const restoreCachedQueries = async () => {
  try {
    const allQueries = trpcQueryClient.getQueryCache().getAll();
    for (const query of allQueries) {
      const cachedData = await cachePersistence.get(
        JSON.stringify(query.queryKey)
      );
      if (cachedData && !query.state.data) {
        // Only restore if query has no current data - provides instant UI
        trpcQueryClient.setQueryData(query.queryKey, cachedData);
      }
    }
  } catch (error) {
    console.warn("Failed to restore cached queries:", error);
  }
};

// Restore on page load for fast initial render
if (typeof window !== "undefined") {
  setTimeout(restoreCachedQueries, 50);
}

// Cache-and-refresh for notebook operations
export const notebookQueryDefaults = {
  // Keep notebook data cached longer for better UX
  gcTime: 1000 * 60 * 10, // 10 minutes
  // Short stale time triggers background refresh while showing cached data
  staleTime: 1000 * 15, // 15 seconds
  // Enable background refresh on focus
  refetchOnWindowFocus: true,
  // Allow cached data on mount, let stale time handle freshness
  refetchOnMount: "always",
  // No polling - rely on user interactions and focus events
  refetchInterval: false,
};

// Cache-and-refresh for tag queries (more cacheable since they change less)
export const tagQueryDefaults = {
  gcTime: 1000 * 60 * 15, // 15 minutes
  staleTime: 1000 * 30, // 30 seconds - tags change less frequently
  refetchOnWindowFocus: true,
  refetchOnMount: "always",
};

// Cache invalidation utilities for mutations
export const cacheInvalidation = {
  // Invalidate specific query keys
  async invalidateQueries(queryKeys: string[]) {
    for (const key of queryKeys) {
      // Invalidate in React Query
      await trpcQueryClient.invalidateQueries({ queryKey: [key] });

      // Remove from IndexedDB
      await cachePersistence.delete(JSON.stringify([key]));
    }
  },

  // Invalidate all queries matching a pattern
  async invalidateByPattern(pattern: string) {
    // Invalidate in React Query
    await trpcQueryClient.invalidateQueries({
      predicate: (query) => {
        const keyStr = JSON.stringify(query.queryKey);
        return keyStr.includes(pattern);
      },
    });

    // Clear matching entries from IndexedDB
    await cachePersistence.deleteByPattern(pattern);
  },

  // Invalidate all notebook-related queries
  async invalidateNotebooks() {
    await this.invalidateByPattern("notebooks");
  },

  // Invalidate all tag-related queries
  async invalidateTags() {
    await this.invalidateByPattern("tags");
  },

  // Force refetch of all active queries
  async refetchAll() {
    await trpcQueryClient.refetchQueries();
  },
};

/**
 * Cache-and-refresh strategy examples:
 *
 * // For fast initial loads with background refresh:
 * const { data: notebooks } = trpc.notebooks.list.useQuery(
 *   { limit: 50 },
 *   notebookQueryDefaults
 * );
 *
 * // For mutations that need cache invalidation:
 * const createNotebook = useMutationWithInvalidation(
 *   (data) => trpc.notebooks.create.mutate(data),
 *   {
 *     invalidatePatterns: ["notebooks"],
 *     onSuccess: () => console.log("Notebook created, cache refreshed")
 *   }
 * );
 *
 * // Manual cache invalidation after external changes:
 * await cacheInvalidation.invalidateNotebooks();
 */

// Cache utilities are available via the cacheInvalidation object above

// Hook for mutations with automatic cache invalidation
export function useMutationWithInvalidation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    onSuccess?: (data: TData, variables: TVariables) => void | Promise<void>;
    onError?: (error: any, variables: TVariables) => void;
    invalidatePatterns?: string[]; // Cache patterns to invalidate on success
    invalidateAll?: boolean; // Invalidate all queries on success
  }
) {
  return useMutation({
    mutationFn,
    onSuccess: async (data, variables) => {
      // Handle cache invalidation
      if (options?.invalidateAll) {
        await cacheInvalidation.refetchAll();
      } else if (options?.invalidatePatterns) {
        for (const pattern of options.invalidatePatterns) {
          await cacheInvalidation.invalidateByPattern(pattern);
        }
      }

      // Call custom onSuccess handler
      if (options?.onSuccess) {
        await options.onSuccess(data, variables);
      }
    },
    onError: options?.onError,
  });
}

/**
 * Hook to create TRPC client with current auth token
 *
 * This client uses a cache-and-refresh strategy:
 * - IndexedDB provides instant initial loads
 * - React Query handles background refresh based on stale time
 * - Server-side caching is disabled to prevent stale data
 */
export function useTRPCClient() {
  const auth = useAuth();

  return useMemo(() => {
    const endpointLink = httpBatchLink({
      url: TRPC_ENDPOINT,
      // Called for every request. See: https://trpc.io/docs/client/headers
      headers: () => {
        const accessToken = auth.accessToken;
        if (!accessToken) {
          return {};
        }
        return {
          Authorization: `Bearer ${accessToken}`,
        };
      },
    });

    const trpcClient = createTRPCClient<AppRouter>({
      links: [endpointLink],
    });

    return createTRPCOptionsProxy<AppRouter>({
      client: trpcClient,
      queryClient: trpcQueryClient,
    });
  }, [auth.accessToken]);
}
