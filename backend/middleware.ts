import { createMiddleware } from "hono/factory";
import { validateAuthPayload, type Passport } from "./auth.ts";
import { type Env } from "./types.ts";
import {
  shouldAuthenticate,
  authenticate,
  createGetJWKS,
} from "@japikey/authenticate";
import { D1Driver } from "@japikey/cloudflare";

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
    const authToken =
      c.req.header("Authorization")?.replace("Bearer ", "") ||
      c.req.header("x-auth-token");

    if (!authToken) {
      return c.json(
        { error: "Unauthorized", message: "Missing auth token" },
        401
      );
    }

    let passport: Passport;
    let userId: string;

    // Check if this is an API key first
    const baseIssuer = new URL("http://localhost:8787/api-keys");

    if (shouldAuthenticate(authToken, baseIssuer)) {
      console.log("🔑 Authenticating with API key");
      // Validate using official japikey authenticate
      const db = new D1Driver(c.env.DB);
      await db.ensureTable(); // Initialize the database table
      const getJWKS = createGetJWKS(baseIssuer);

      const payload = await authenticate(authToken, {
        baseIssuer,
        getJWKS,
      });

      // Convert japikey payload to our passport format
      passport = {
        user: {
          id: payload.sub as string,
          email: (payload as any).email || "api-key@example.com",
          name: "API Key User",
          isAnonymous: false,
        },
        jwt: payload,
      };
      userId = payload.sub as string;
    } else {
      // Fall back to existing auth logic (OIDC JWT or service token)
      const validatedUser = await validateAuthPayload({ authToken }, c.env);

      // Create passport-like object for compatibility
      passport = {
        user: validatedUser,
        jwt: { runtime: false }, // Default for HTTP requests
      };
      userId = validatedUser.id;
    }

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
    const authToken =
      c.req.header("Authorization")?.replace("Bearer ", "") ||
      c.req.header("x-auth-token");

    if (authToken) {
      try {
        let passport: Passport;
        let userId: string;

        // Check if this is an API key first
        const baseIssuer = new URL("http://localhost:8787/api-keys");

        if (shouldAuthenticate(authToken, baseIssuer)) {
          // Validate using official japikey authenticate
          const db = new D1Driver(c.env.DB);
          await db.ensureTable(); // Initialize the database table
          const getJWKS = createGetJWKS(baseIssuer);

          const payload = await authenticate(authToken, {
            baseIssuer,
            getJWKS,
          });

          // Convert japikey payload to our passport format
          passport = {
            user: {
              id: payload.sub as string,
              email: (payload as any).email || "api-key@example.com",
              name: "API Key User",
              isAnonymous: false,
            },
            jwt: payload,
          };
          userId = payload.sub as string;
        } else {
          // Fall back to existing auth logic (OIDC JWT or service token)
          const validatedUser = await validateAuthPayload({ authToken }, c.env);

          // Create passport-like object for compatibility
          passport = {
            user: validatedUser,
            jwt: { runtime: false }, // Default for HTTP requests
          };
          userId = validatedUser.id;
        }

        c.set("passport", passport);
        c.set("userId", userId);
        c.set("isRuntime", false); // HTTP requests are typically not runtime
      } catch (error) {
        console.warn("Optional auth failed:", error);
      }
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
