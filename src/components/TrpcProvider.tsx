import { trpcQueryClient } from "@/lib/trpc-client";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";

interface TrpcProviderProps {
  children: ReactNode;
}

export const TrpcProvider = ({ children }: TrpcProviderProps) => {
  return (
    <QueryClientProvider client={trpcQueryClient}>
      {children}
    </QueryClientProvider>
  );
};
