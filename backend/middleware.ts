import { createMiddleware } from "hono/factory";
import {
  validateAuthPayload,
  type Passport,
  extractAuthToken,
  getValidatedUser,
} from "./auth.ts";
import { type Env } from "./types.ts";

export interface AuthContext {
  passport?: Passport;
  userId?: string;
  isRuntime?: boolean;
}

// Auth middleware for standard API routes
export const authMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: AuthContext;
}>(async (c, next) => {
  try {
    const authToken = extractAuthToken(c.req.raw);
    const validatedUser = await getValidatedUser(authToken, c.env);

    if (!validatedUser) {
      return c.json(
        { error: "Unauthorized", message: "Missing or invalid auth token" },
        401
      );
    }

    // Create passport-like object for compatibility
    const passport: Passport = {
      user: validatedUser,
      jwt: { runtime: false }, // Default for HTTP requests
    };
    const userId = validatedUser.id;

    c.set("passport", passport);
    c.set("userId", userId);
    c.set("isRuntime", false); // HTTP requests are typically not runtime

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
    const authToken = extractAuthToken(c.req.raw);
    const validatedUser = await getValidatedUser(authToken, c.env);

    if (validatedUser) {
      // Create passport-like object for compatibility
      const passport: Passport = {
        user: validatedUser,
        jwt: { runtime: false }, // Default for HTTP requests
      };
      const userId = validatedUser.id;

      c.set("passport", passport);
      c.set("userId", userId);
      c.set("isRuntime", false); // HTTP requests are typically not runtime
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
