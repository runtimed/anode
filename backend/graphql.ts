import { createSchema, createYoga } from "graphql-yoga";
import { GraphQLError } from "graphql";
import { type ValidatedUser, extractAndValidateUser } from "./auth.ts";
import { type Env } from "./types.ts";

type ServerContext = {
  auth: ValidatedUser | null;
} & Env;

export const yoga = createYoga<ServerContext>({
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
        me: (_, __, context) => {
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
  cors: {
    origin: "*",
    credentials: true,
  },
  maskedErrors: false,
  context: async (context) => {
    const request = context.request;
    let auth: ValidatedUser | null = null;

    auth = await extractAndValidateUser(request, context);

    return { auth, env: context };
  },
});
