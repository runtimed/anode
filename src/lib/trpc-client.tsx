import { QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { useAuth } from "react-oidc-context";
import { useMemo } from "react";

import type { AppRouter } from "../../backend/trpc/index";
//     👆 **type-only** import

const TRPC_ENDPOINT = "/api/trpc";

export const trpcQueryClient = new QueryClient();

// Hook to create TRPC client with current auth token
export function useTRPCClient() {
  const auth = useAuth();

  return useMemo(() => {
    const endpointLink = httpBatchLink({
      url: TRPC_ENDPOINT,
      // Called for every request. See: https://trpc.io/docs/client/headers
      headers: () => {
        const accessToken = auth.user?.access_token;
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
  }, [auth.user?.access_token]);
}

// For backwards compatibility - components that use this will need to be wrapped in TrpcProvider
export const trpc = {
  notebooks: {
    useQuery: () => {
      throw new Error(
        "trpc.notebooks.useQuery must be used inside a component wrapped with TrpcProvider. Use useTRPCClient() hook instead."
      );
    },
  },
  me: {
    useQuery: () => {
      throw new Error(
        "trpc.me.useQuery must be used inside a component wrapped with TrpcProvider. Use useTRPCClient() hook instead."
      );
    },
  },
};
