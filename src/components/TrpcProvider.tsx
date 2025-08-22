import { trpcQueryClient } from "@/lib/trpc-client";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ReactNode, useEffect } from "react";

interface TrpcProviderProps {
  children: ReactNode;
}

// I added mounting check because I've only seen a tRPC provider added above the
// routing layer, and our approach, and using AI makes it easier to accidentally
// have two.

// Having two tRPC providers probably won't cause an issues, and it's possible
// to define two in a codebase and have them point to different endpoints. But
// we're not doing that so for us it just safer.

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
