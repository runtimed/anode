import { createYoga, createSchema } from "graphql-yoga";
import { typeDefs } from "./schema.ts";
import { resolvers, type GraphQLContext } from "./resolvers.ts";
import { validateAuthPayload, type ValidatedUser } from "../auth.ts";
import { createApiKeyProvider } from "../providers/api-key-factory.ts";
import { createProviderContext } from "../api-key-provider.ts";
import { createPermissionsProvider } from "../permissions/factory.ts";
import { NoPermissionsProvider } from "../permissions/no-permissions.ts";
import { UserRegistry } from "../users/user-registry.ts";
import type { Env } from "../types.ts";
import { GraphQLError, parse, visit } from "graphql";

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

    // GraphQL playground in all environments
    graphiql: {
      title: "Runt GraphQL API",
      defaultQuery: `
        # Welcome to Runt GraphQL API
        # Add your Authorization header in the Headers tab below

        query {
          me {
            id
            email
            name
          }
        }
      `,
    },

    // Context function - called for each request
    context: async (context) => {
      const env = context as Env;

      try {
        const request = context.request;

        // Check if this is a PURE introspection query (for GraphiQL schema explorer)
        let isPureIntrospectionQuery = false;
        if (request.method === "POST" || request.method === "GET") {
          try {
            let query = "";
            if (request.method === "POST") {
              const body = await request.clone().json();
              query = body.query || "";
            } else {
              // GET request with query parameter
              const url = new URL(request.url);
              query = url.searchParams.get("query") || "";
            }

            // Parse the GraphQL query to check if it's purely introspection
            if (query.trim()) {
              const ast = parse(query);
              let hasNonIntrospectionField = false;
              let hasIntrospectionField = false;

              visit(ast, {
                Field: (node) => {
                  const fieldName = node.name.value;
                  if (fieldName.startsWith("__")) {
                    hasIntrospectionField = true;
                  } else {
                    hasNonIntrospectionField = true;
                  }
                },
              });

              // Only allow if it has introspection fields AND no non-introspection fields
              isPureIntrospectionQuery =
                hasIntrospectionField && !hasNonIntrospectionField;
            }
          } catch {
            // If we can't parse the query, assume it's not safe introspection
            isPureIntrospectionQuery = false;
          }
        }

        // Allow PURE introspection queries without authentication in development
        if (isPureIntrospectionQuery && env.DEPLOYMENT_ENV === "development") {
          console.log("🔍 Allowing introspection query without authentication");

          // Return context with no user and no-op permissions provider
          const noPermissionsProvider = new NoPermissionsProvider();
          const userRegistry = new UserRegistry(env.DB);

          return {
            ...env,
            user: null,
            permissionsProvider: noPermissionsProvider,
            userRegistry,
          };
        }

        // Extract authorization header for regular queries
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

        // Create permissions provider and user registry
        const permissionsProvider = createPermissionsProvider(env);
        const userRegistry = new UserRegistry(env.DB);

        // Upsert user record (only for OAuth tokens with full user data)
        if (!validatedUser.isAnonymous && validatedUser.name) {
          await userRegistry.upsertUser(validatedUser);
        }

        // Return full GraphQL context
        const graphqlContext: GraphQLContext = {
          ...env,
          user: validatedUser,
          permissionsProvider,
          userRegistry,
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
  });

  return yoga;
}
