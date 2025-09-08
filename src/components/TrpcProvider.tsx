import { trpcQueryClient, useTRPCClient } from "@/lib/trpc-client";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ReactNode, useEffect, createContext, useContext } from "react";

interface TrpcProviderProps {
  children: ReactNode;
}

// Create context for TRPC client
const TrpcContext = createContext<ReturnType<typeof useTRPCClient> | null>(
  null
);

export const useTrpc = () => {
  const trpc = useContext(TrpcContext);
  if (!trpc) {
    throw new Error("useTrpc must be used within TrpcProvider");
  }
  return trpc;
};

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
 * This is a wrapper component that provides the trpcQueryClient and auth-aware TRPC client to the children.
 * It also includes the ReactQueryDevtools for development.
 *
 */
export const TrpcProvider = ({ children }: TrpcProviderProps) => {
  useCheckMountedOnlyOnce();
  const trpc = useTRPCClient();

  return (
    <QueryClientProvider client={trpcQueryClient}>
      <TrpcContext.Provider value={trpc}>
        {children}
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </TrpcContext.Provider>
    </QueryClientProvider>
  );
};
