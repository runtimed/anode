import { QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { useAuth } from "@/auth";
import { useMemo } from "react";

import type { AppRouter } from "../../backend/trpc/index";
//     👆 **type-only** import

// IndexedDB cache persistence for critical queries
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

    // Only persist critical queries to avoid bloating storage
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
      const keyStr = queryKeyStr;
      const transaction = this.db.transaction([CACHE_STORE_NAME], "readonly");
      const store = transaction.objectStore(CACHE_STORE_NAME);

      return new Promise((resolve) => {
        const request = store.get(keyStr);
        request.onsuccess = () => {
          const entry = request.result as CacheEntry | undefined;
          if (!entry) {
            resolve(null);
            return;
          }

          // Check if data is still fresh
          const age = Date.now() - entry.timestamp;
          if (age > entry.staleTime) {
            // Data is stale, remove it
            store.delete(keyStr);
            resolve(null);
            return;
          }

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
    // Only persist critical queries that benefit from caching
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
      // Default cache time - keep data in cache for 10 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      // Stale time - consider data fresh for 2 minutes
      staleTime: 1000 * 60 * 2, // 2 minutes
      // Retry failed requests
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Enable background refetch when window regains focus
      refetchOnWindowFocus: true,
      // Disable background refetch on reconnect (reduces D1 load)
      refetchOnReconnect: false,
      // Aggressive caching for notebook-related queries
      meta: {
        // Custom meta to identify cacheable queries
        cacheable: true,
      },
    },
  },
});

// Add cache persistence hooks
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

// Experimental: Restore cached data on client initialization
const restoreCachedQueries = async () => {
  // This is experimental and may need refinement
  try {
    const allQueries = trpcQueryClient.getQueryCache().getAll();
    for (const query of allQueries) {
      const cachedData = await cachePersistence.get(
        JSON.stringify(query.queryKey)
      );
      if (cachedData && !query.state.data) {
        // Only restore if query has no current data
        trpcQueryClient.setQueryData(query.queryKey, cachedData);
      }
    }
  } catch (error) {
    console.warn("Failed to restore cached queries:", error);
  }
};

// Restore on page load (non-blocking)
if (typeof window !== "undefined") {
  setTimeout(restoreCachedQueries, 100);
}

// Specialized query client for expensive operations
export const notebookQueryDefaults = {
  // Keep notebook data cached for 15 minutes
  gcTime: 1000 * 60 * 15,
  // Consider notebook data fresh for 5 minutes
  staleTime: 1000 * 60 * 5,
  // Reduce background refetches
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  // Enable stale-while-revalidate pattern
  refetchInterval: 1000 * 60 * 10, // Background refresh every 10 minutes
};

// Specialized defaults for tag queries (even more cacheable)
export const tagQueryDefaults = {
  gcTime: 1000 * 60 * 30, // 30 minutes
  staleTime: 1000 * 60 * 10, // 10 minutes
  refetchOnWindowFocus: false,
  refetchOnMount: false,
};

// Hook to create TRPC client with current auth token
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
