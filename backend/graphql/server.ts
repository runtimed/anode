import { createSchema, createYoga } from "graphql-yoga";

import { type ValidatedUser, extractAndValidateUser } from "../auth.ts";
import { type Env } from "../types.ts";
import { typeDefs } from "./schema.ts";
import { resolvers, type GraphQLContext } from "./resolvers.ts";
import { createPermissionsProvider } from "../runbook-permissions/factory.ts";

export const yoga = createYoga<GraphQLContext>({
  schema: createSchema({
    typeDefs,
    resolvers,
  }),

  // GraphiQL configuration
  graphiql: {
    title: "Runt GraphQL API",
    defaultQuery: `
      # Welcome to Runt GraphQL API
      # Add your Authorization header in the Headers tab below

      query {
        me {
          id
          email
          givenName
          familyName
        }
      }
    `,
  },
  cors: {
    origin: "*",
    credentials: true,
  },
  maskedErrors: false,
  context: async (context) => {
    const request = context.request;
    const env = context as Env;

    let auth: ValidatedUser | null = null;
    auth = await extractAndValidateUser(request, context);

    // Create permissions provider
    const permissionsProvider = createPermissionsProvider(env);

    // Return GraphQL context with user and permissions
    const graphqlContext: GraphQLContext = {
      ...env,
      user: auth,
      permissionsProvider,
    };

    return graphqlContext;
  },
});
