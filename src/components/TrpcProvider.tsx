import { trpcQueryClient } from "@/lib/trpc-client";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ReactNode, useEffect } from "react";

interface TrpcProviderProps {
  children: ReactNode;
}

// Global flag to track if TrpcProvider is already mounted
let isMounted = false;

function useCheckMountedOnlyOnce() {
  useEffect(() => {
    if (isMounted) {
      throw new Error(
        "TrpcProvider is already mounted on this page. Only one TrpcProvider should be included per page."
      );
    }

    isMounted = true;

    return () => {
      isMounted = false;
    };
  }, []);
}

/**
 * 🚨 IMPORTANT: only include once in a page.
 *
 * Does not handle refreshing token, so make sure to render inside a component that does.
 *
 * This is a wrapper component that provides the trpcQueryClient to the children.
 * It also includes the ReactQueryDevtools for development.
 *
 */
export const TrpcProvider = ({ children }: TrpcProviderProps) => {
  useCheckMountedOnlyOnce();

  return (
    <QueryClientProvider client={trpcQueryClient}>
      {children}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
};
