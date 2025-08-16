import { createSchema, createYoga } from "graphql-yoga";
import { GraphQLError } from "graphql";
import { validateAuthPayload, type ValidatedUser } from "./auth.ts";
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
  context: async ({ request, env }: any): Promise<GraphQLContext> => {
    // Extract auth from request
    let auth: ValidatedUser | undefined = undefined;
    try {
      const authToken =
        request.headers.get("Authorization")?.replace("Bearer ", "") ||
        request.headers.get("X-Auth-Token");

      if (authToken && env) {
        const validatedUser = await validateAuthPayload(
          { authToken },
          env as Env
        );
        auth = validatedUser;
      }
    } catch (error) {
      console.warn("GraphQL auth extraction failed:", error);
      // Don't fail the request, just proceed without auth
    }

    return { auth, env: env as Env };
  },
});
