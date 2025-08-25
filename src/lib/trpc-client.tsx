import { QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";

import type { AppRouter } from "../../backend/trpc/index";
//     👆 **type-only** import

const TRPC_ENDPOINT = "/api/trpc";

const endpointLink = httpBatchLink({
  url: TRPC_ENDPOINT,
  // Called for every request. See: https://trpc.io/docs/client/headers
  headers: () => {
    // Get access token directly from OIDC storage
    try {
      const oidcStorage = sessionStorage.getItem(
        `oidc.user:${import.meta.env.VITE_AUTH_URI}:${import.meta.env.VITE_AUTH_CLIENT_ID}`
      );
      if (oidcStorage) {
        const user = JSON.parse(oidcStorage);
        if (user?.access_token) {
          return {
            Authorization: `Bearer ${user.access_token}`,
          };
        }
      }
    } catch (error) {
      console.warn("Failed to get auth token for TRPC:", error);
    }
    return {};
  },
});

export const trpcQueryClient = new QueryClient();

const trpcClient = createTRPCClient<AppRouter>({
  links: [endpointLink],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient: trpcQueryClient,
});
