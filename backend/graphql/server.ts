import { createYoga, createSchema } from "graphql-yoga";
import { typeDefs } from "./schema.ts";
import { resolvers, type GraphQLContext } from "./resolvers.ts";
import { validateAuthPayload, type ValidatedUser } from "../auth.ts";
import { createApiKeyProvider } from "../providers/api-key-factory.ts";
import { createProviderContext } from "../api-key-provider.ts";
import {
  createPermissionsProvider,
  type PermissionsProvider,
} from "../permissions/factory.ts";
import type { Env } from "../types.ts";
import { GraphQLError } from "graphql";

/**
 * Create and configure the GraphQL server
 */
export function createGraphQLServer() {
  const yoga = createYoga<GraphQLContext>({
    schema: createSchema({
      typeDefs,
      resolvers,
    }),

    // Enable CORS for cross-origin requests
    cors: {
      origin: "*",
      credentials: true,
    },

    // GraphQL playground in development
    graphiql: {
      // Only enable GraphiQL in development environments
      title: "Anode GraphQL API",
    },

    // Context function - called for each request
    context: async (context) => {
      const env = context as Env;

      try {
        // Extract authorization header
        const request = context.request;
        const authHeader = request.headers.get("Authorization");

        if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
          throw new GraphQLError("Missing or invalid Authorization header", {
            extensions: { code: "UNAUTHENTICATED" },
          });
        }

        const authToken = authHeader.substring(7);
        let validatedUser: ValidatedUser;

        // Try API key authentication first
        try {
          const apiKeyProvider = createApiKeyProvider(env);
          const providerContext = createProviderContext(env, authToken);

          if (apiKeyProvider.isApiKey(providerContext)) {
            const passport =
              await apiKeyProvider.validateApiKey(providerContext);
            validatedUser = passport.user;
            console.log("✅ GraphQL authenticated via API key:", {
              userId: validatedUser.id,
              email: validatedUser.email,
            });
          } else {
            // Fall back to existing auth logic (OIDC JWT or service token)
            validatedUser = await validateAuthPayload({ authToken }, env);
          }
        } catch {
          // If API key provider fails, try standard auth as fallback
          validatedUser = await validateAuthPayload({ authToken }, env);
        }

        // Create permissions provider
        const permissionsProvider = createPermissionsProvider(env);

        // Return full GraphQL context
        const graphqlContext: GraphQLContext = {
          ...env,
          user: validatedUser,
          permissionsProvider,
        };

        return graphqlContext;
      } catch (error) {
        console.error("❌ GraphQL authentication failed:", error);
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError("Authentication failed", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }
    },

    // Error handling is handled by default GraphQL Yoga error handling

    // Custom logging can be added via plugins if needed
  });

  return yoga;
}

/**
 * Create GraphQL context with authentication and permissions
 * @deprecated - Authentication is now handled internally in the server context function
 */
export function createGraphQLContext(
  env: Env,
  user: ValidatedUser,
  permissionsProvider: PermissionsProvider
): GraphQLContext {
  return {
    ...env,
    user,
    permissionsProvider,
  };
}
