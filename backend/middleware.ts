import { createMiddleware } from "hono/factory";
import { getPassport, validateAuthPayload, type Passport } from "./auth.ts";
import { type Env } from "./types.ts";

export interface AuthContext {
  passport?: Passport;
  userId?: string;
  isRuntime?: boolean;
}

// Adapter for converting Hono requests to Worker requests for auth
// Type incompatibility between Hono and Cloudflare Worker requires as any
function adaptRequestForAuth(honoRequest: Request): any {
  return honoRequest as any;
}

// Auth middleware for standard API routes
export const authMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: AuthContext;
}>(async (c, next) => {
  try {
    const authToken =
      c.req.header("Authorization")?.replace("Bearer ", "") ||
      c.req.header("x-auth-token");

    if (!authToken) {
      return c.json(
        { error: "Unauthorized", message: "Missing auth token" },
        401
      );
    }

    const passport = await getPassport(adaptRequestForAuth(c.req.raw), c.env);

    c.set("passport", passport);
    c.set("userId", passport.user.id);
    c.set("isRuntime", Boolean(passport.jwt.runtime));

    await next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return c.json(
      {
        error: "Unauthorized",
        message:
          error instanceof Error ? error.message : "Auth validation failed",
      },
      401
    );
  }
});

// Optional auth middleware - continues even if auth fails
export const optionalAuthMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: AuthContext;
}>(async (c, next) => {
  try {
    const authToken =
      c.req.header("Authorization")?.replace("Bearer ", "") ||
      c.req.header("x-auth-token");

    if (authToken) {
      const passport = await getPassport(adaptRequestForAuth(c.req.raw), c.env);
      c.set("passport", passport);
      c.set("userId", passport.user.id);
      c.set("isRuntime", Boolean(passport.jwt.runtime));
    }
  } catch (error) {
    console.warn("Optional auth failed:", error);
  }

  await next();
});

// WebSocket auth middleware using query payload
export const payloadAuthMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: AuthContext;
}>(async (c, next) => {
  try {
    const payloadParam = c.req.query("payload");
    if (!payloadParam) {
      return c.json({ error: "Missing payload parameter" }, 400);
    }

    const payload = JSON.parse(decodeURIComponent(payloadParam));
    const validatedPayload = await validateAuthPayload(payload, c.env);

    c.set("userId", validatedPayload.id);
    c.set("isRuntime", Boolean(payload.runtime));

    await next();
  } catch (error) {
    console.error("Payload auth error:", error);
    return c.json(
      {
        error: "Unauthorized",
        message:
          error instanceof Error ? error.message : "Payload validation failed",
      },
      401
    );
  }
});
