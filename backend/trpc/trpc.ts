import { initTRPC } from "@trpc/server";
import { ValidatedUser } from "backend/auth";
import { Env } from "backend/types";
import { PermissionsProvider } from "backend/permissions/types";

export type TrcpContext = {
  env: Env;
  user: ValidatedUser | null;
  permissionsProvider: PermissionsProvider;
};

/**
 * Initialization of tRPC backend
 * Should be done only once per backend!
 */
const t = initTRPC.context<TrcpContext>().create();

/**
 * Export reusable router and procedure helpers
 * that can be used throughout the router
 */
export const router = t.router;
export const publicProcedure = t.procedure;
