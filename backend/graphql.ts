import { createSchema, createYoga } from "graphql-yoga";
import { GraphQLError } from "graphql";
import { validateAuthPayload, type ValidatedUser } from "./auth.ts";
import { createApiKeyProvider } from "./providers/api-key-factory.ts";
import { createProviderContext } from "./api-key-provider.ts";
import { type Env } from "./types.ts";

// GraphQL Context type
interface GraphQLContext {
  auth?: ValidatedUser;
  env?: Env;
}

export const yoga = createYoga({
  schema: createSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        me: User
      }

      type User {
        id: String!
        email: String
        name: String
      }
    `,
    resolvers: {
      Query: {
        me: (_, __, context: GraphQLContext) => {
          if (!context.auth) {
            throw new GraphQLError("Authentication required", {
              extensions: { code: "UNAUTHENTICATED" },
            });
          }
          return context.auth;
        },
      },
    },
  }),
  // Enable CORS for GraphQL
  cors: {
    origin: "*",
    credentials: true,
  },
  // Error handling configuration
  maskedErrors: false, // Show detailed errors in development
  // Custom context with auth
  context: async (context): Promise<GraphQLContext> => {
    // Access env directly from context parameter (passed as second arg to yoga.fetch)
    const env = context as Env;
    const request = context.request;
    // Extract auth from request
    let auth: ValidatedUser | undefined = undefined;

    console.log("GraphQL context: extracting auth...");

    try {
      const authHeader = request.headers.get("Authorization");
      const xAuthHeader = request.headers.get("X-Auth-Token");

      console.log("GraphQL auth headers:", {
        hasAuthHeader: !!authHeader,
        hasXAuthHeader: !!xAuthHeader,
        authHeaderPrefix: authHeader?.substring(0, 20) + "...",
      });

      const authToken = authHeader?.replace("Bearer ", "") || xAuthHeader;

      if (!authToken) {
        console.log("GraphQL: No auth token found in headers");
        return { auth: undefined, env: env as Env };
      }

      if (!env) {
        console.log("GraphQL: No env provided to context");
        return { auth: undefined, env: env as Env };
      }

      console.log("GraphQL: Validating auth token...");

      // Debug: Decode JWT to see issuer before validation
      try {
        const parts = authToken.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          console.log("GraphQL: JWT payload info:", {
            iss: payload.iss,
            expectedIssuer: (env as Env).AUTH_ISSUER,
            sub: payload.sub,
            exp: payload.exp,
            iat: payload.iat,
          });
        }
      } catch (decodeError) {
        console.log("GraphQL: Could not decode JWT:", decodeError);
      }

      let validatedUser: ValidatedUser;

      // Try API key authentication first
      try {
        const apiKeyProvider = createApiKeyProvider(env as Env);
        const providerContext = createProviderContext(env as Env, authToken);

        if (apiKeyProvider.isApiKey(providerContext)) {
          const passport = await apiKeyProvider.validateApiKey(providerContext);
          validatedUser = passport.user;
          console.log("✅ GraphQL authenticated via API key:", {
            userId: validatedUser.id,
            email: validatedUser.email,
          });
        } else {
          // Fall back to existing auth logic (OIDC JWT or service token)
          validatedUser = await validateAuthPayload({ authToken }, env as Env);
        }
      } catch {
        // If API key provider fails, try standard auth as fallback
        validatedUser = await validateAuthPayload({ authToken }, env as Env);
      }

      auth = validatedUser;
      console.log("GraphQL: Auth validation successful:", {
        userId: auth.id,
        email: auth.email,
      });
    } catch (error) {
      console.error("GraphQL auth extraction failed:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Don't fail the request, just proceed without auth
    }

    return { auth, env: env as Env };
  },
});
