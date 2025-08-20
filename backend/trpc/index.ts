import { publicProcedure, router } from "./trpc";
import { z } from "zod";

// Create the tRPC router
export const appRouter = router({
  debug: publicProcedure.query(async () => {
    return "Hello, world!";
  }),
  userById: publicProcedure.input(z.string()).query(async (opts) => {
    const { input } = opts;
    const user = {
      id: input,
      givenName: "John",
      familyName: "Doe",
    };
    return user;
  }),
});

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter;
