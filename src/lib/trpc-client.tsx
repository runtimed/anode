import { QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { useAuth } from "@/auth";
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
