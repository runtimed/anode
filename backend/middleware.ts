import { createMiddleware } from "hono/factory";
import { validateAuthPayload, type Passport } from "./auth.ts";
import { type Env } from "./types.ts";
import { createApiKeyProvider } from "./providers/api-key-factory.ts";
import { createProviderContext } from "./api-key-provider.ts";

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
    try {
      const apiKeyProvider = createApiKeyProvider(c.env);
      const providerContext = createProviderContext(c.env, authToken);

      if (apiKeyProvider.isApiKey(providerContext)) {
        console.log("🔑 Authenticating with API key");
        // Validate using API key provider
        passport = await apiKeyProvider.validateApiKey(providerContext);
        userId = passport.user.id;
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
    } catch (apiError) {
      // If API key provider fails, try standard auth as fallback
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
        try {
          const apiKeyProvider = createApiKeyProvider(c.env);
          const providerContext = createProviderContext(c.env, authToken);

          if (apiKeyProvider.isApiKey(providerContext)) {
            // Validate using API key provider
            passport = await apiKeyProvider.validateApiKey(providerContext);
            userId = passport.user.id;
          } else {
            // Fall back to existing auth logic (OIDC JWT or service token)
            const validatedUser = await validateAuthPayload(
              { authToken },
              c.env
            );

            // Create passport-like object for compatibility
            passport = {
              user: validatedUser,
              jwt: { runtime: false }, // Default for HTTP requests
            };
            userId = validatedUser.id;
          }
        } catch (apiError) {
          // If API key provider fails, try standard auth as fallback
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
