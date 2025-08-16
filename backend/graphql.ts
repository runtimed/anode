import { createSchema, createYoga } from "graphql-yoga";
import { GraphQLError } from "graphql";
import { type ValidatedUser, extractAndValidateUser } from "./auth.ts";
import { type Env } from "./types.ts";

// GraphQL Context type
interface GraphQLContext {
  auth: ValidatedUser | null;
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
    const env = context as unknown as Env;
    const request = context.request;
    // Extract auth from request
    let auth: ValidatedUser | null = null;

    console.log("GraphQL context: extracting auth...");

    try {
      // Use centralized auth utility
      auth = await extractAndValidateUser(request, env as Env);

      if (auth) {
        console.log("✅ GraphQL authenticated:", {
          userId: auth.id,
          email: auth.email,
        });
      } else {
        console.log("GraphQL: No valid authentication found");
      }
    } catch (error) {
      console.error("GraphQL auth extraction failed:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }

    return { auth, env: env as Env };
  },
});
