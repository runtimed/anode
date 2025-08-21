import { QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";

import { getOpenIdService } from "@/services/openid";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";

import type { AppRouter } from "../../backend/trpc/index";
//     👆 **type-only** import

const TRPC_ENDPOINT = "/api/trpc";

const endpointLink = httpBatchLink({
  url: TRPC_ENDPOINT,
  // Called for every request. See: https://trpc.io/docs/client/headers
  headers: () => {
    const accessToken = getOpenIdService().getTokens()?.accessToken;
    if (!accessToken) return {};
    return {
      Authorization: `Bearer ${accessToken}`, // TODO: use refresh token
    };
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
