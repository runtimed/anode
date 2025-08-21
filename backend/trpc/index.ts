import { ValidatedUser } from "backend/auth";
import { publicProcedure, router } from "./trpc";

interface RunbookRow {
  ulid: string;
  owner_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

// Create the tRPC router
export const appRouter = router({
  debug: publicProcedure.query(async () => {
    return "Hello, world!";
  }),
  context: publicProcedure.query(async (opts) => {
    const { ctx } = opts;
    return ctx;
  }),
  notebooks: publicProcedure.query(async (opts) => {
    const { ctx } = opts;

    const query = `
      SELECT ulid, owner_id, title, created_at, updated_at
      FROM runbooks
      WHERE owner_id = ?
      ORDER BY updated_at DESC
    `;

    const result = await ctx.env.DB.prepare(query)
      .bind(ctx.user?.id ?? "")
      .all<RunbookRow>();

    return result.results;
  }),
  user: publicProcedure.query(async (opts) => {
    const { ctx } = opts;

    console.log("🚨", { ctx });

    const user = await ctx.env.DB.prepare("SELECT * FROM users WHERE id = ?")
      .bind(ctx.user?.id ?? "")
      .first<ValidatedUser>();

    return user;
  }),
});

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter;
