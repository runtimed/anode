import React, { createContext, useContext, useMemo } from "react";
import {
  Client,
  Provider as UrqlProvider,
  createClient,
  fetchExchange,
} from "urql";
import { useSimpleAuth } from "../auth/use-simple-auth.js";

// GraphQL endpoint - relative to current origin
const GRAPHQL_ENDPOINT = "/graphql";

interface GraphQLClientContextValue {
  client: Client;
}

const GraphQLClientContext = createContext<GraphQLClientContextValue | null>(
  null
);

export const useGraphQLClient = () => {
  const context = useContext(GraphQLClientContext);
  if (!context) {
    throw new Error(
      "useGraphQLClient must be used within a GraphQLClientProvider"
    );
  }
  return context;
};

interface GraphQLClientProviderProps {
  children: React.ReactNode;
}

export const GraphQLClientProvider: React.FC<GraphQLClientProviderProps> = ({
  children,
}) => {
  const { accessToken } = useSimpleAuth();

  const client = useMemo(() => {
    return createClient({
      url: GRAPHQL_ENDPOINT,
      exchanges: [fetchExchange],
      fetchOptions: () => {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        if (accessToken) {
          headers.Authorization = `Bearer ${accessToken}`;
        }

        return { headers };
      },
      requestPolicy: "cache-and-network",
    });
  }, [accessToken]);

  const contextValue = useMemo(() => ({ client }), [client]);

  return (
    <GraphQLClientContext.Provider value={contextValue}>
      <UrqlProvider value={client}>{children}</UrqlProvider>
    </GraphQLClientContext.Provider>
  );
};

// Re-export urql hooks for convenience
export { useQuery, useMutation, useSubscription } from "urql";
