import { QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";

import type { AppRouter } from "../../backend/index";
//     👆 **type-only** import

const endpointLink = httpBatchLink({
  url: "/api/trpc",
});

import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
export const trpcQueryClient = new QueryClient();
const trpcClient = createTRPCClient<AppRouter>({
  links: [endpointLink],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient: trpcQueryClient,
});
