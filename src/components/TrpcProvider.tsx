import { trpcQueryClient } from "@/lib/trpc-client";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ReactNode } from "react";

interface TrpcProviderProps {
  children: ReactNode;
}

/**
 * 🚨 IMPORTANT: only include once in a page
 *
 * This is a wrapper component that provides the trpcQueryClient to the children.
 * It also includes the ReactQueryDevtools for development.
 *
 */
export const TrpcProvider = ({ children }: TrpcProviderProps) => {
  return (
    <QueryClientProvider client={trpcQueryClient}>
      {children}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
};
