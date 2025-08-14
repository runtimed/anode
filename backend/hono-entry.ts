import { Hono } from "hono";
import { cors } from "hono/cors";
import { WebSocketServer } from "./sync.ts";
import originalHandler from "./entry.ts";
import { type Env } from "./types.ts";
import { type AuthContext } from "./middleware.ts";
import { RuntError, ErrorType } from "@runtimed/extensions";
import apiRoutes from "./routes.ts";
import localOidcRoutes from "./local-oidc-routes.ts";

// Re-export the Durable Object class for the Workers runtime
export { WebSocketServer };

// Create a simple Hono app for middleware
const app = new Hono<{ Bindings: Env; Variables: AuthContext }>();

// Global error handling middleware
app.onError(async (error, c) => {
  let runtError: RuntError;
  if (error instanceof RuntError) {
    runtError = error;
  } else {
    runtError = new RuntError(ErrorType.Unknown, { cause: error as Error });
  }

  if (runtError.statusCode === 500) {
    console.error(
      "500 error for request",
      c.req.url,
      JSON.stringify(runtError.getPayload(true), null, 2)
    );
  }

  return c.json(
    runtError.getPayload(c.env.DEBUG ?? false),
    runtError.statusCode as any
  );
});

// Global CORS middleware
app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "x-notebook-id"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

// Logging middleware
app.use("*", async (c, next) => {
  const url = new URL(c.req.url);
  console.log("🔍 Hono middleware:", {
    method: c.req.method,
    pathname: url.pathname,
  });
  await next();
});

// Environment-based security check middleware for local OIDC
app.use("/local_oidc/*", async (c, next) => {
  const allowLocalAuth = c.env.ALLOW_LOCAL_AUTH === "true";

  if (!allowLocalAuth) {
    return c.json({ error: "Local OIDC is disabled" }, 403);
  }

  // Security check: prevent local auth in production
  if (c.env.DEPLOYMENT_ENV === "production") {
    return c.json(
      {
        error: "SECURITY_ERROR",
        message:
          "Local authentication cannot be enabled in production environments",
      },
      500
    );
  }

  await next();
});

// Mount API routes (health, debug, artifacts, API keys)
app.route("/api", apiRoutes);

// Mount local OIDC routes (development only)
app.route("/local_oidc", localOidcRoutes);

// JWKS endpoint for API key validation - must be at /api-keys/:id/.well-known/jwks.json
app.get("/api-keys/:id/.well-known/jwks.json", async (c) => {
  try {
    const keyId = c.req.param("id");

    if (!keyId) {
      return c.json(
        {
          error: "Bad Request",
          message: "Key ID is required",
        },
        400
      );
    }

    // Get the specific API key's public key directly from D1
    const result = await c.env.DB.prepare(
      "SELECT kid, jwk FROM japikeys WHERE kid = ? AND revoked = 0"
    )
      .bind(keyId)
      .first();

    if (!result) {
      return c.json(
        {
          error: "Not Found",
          message: "API key not found or revoked",
        },
        404
      );
    }

    const jwks = {
      keys: [
        {
          ...JSON.parse(result.jwk as string),
          kid: result.kid,
          use: "sig",
          alg: "RS256",
        },
      ],
    };

    return c.json(jwks);
  } catch (error) {
    console.error("❌ JWKS endpoint error:", error);
    return c.json(
      {
        error: "Internal Server Error",
        message: "Failed to retrieve public key",
      },
      500
    );
  }
});

// Catch-all route that delegates to original handler
app.all("*", async (c) => {
  // Convert to original Cloudflare Worker format (type incompatibility requires as any)
  const request = c.req.raw as any;
  const env = c.env;

  // Handle test environment where executionCtx might not be available
  let ctx: any = {};
  try {
    ctx = c.executionCtx;
  } catch {
    // In test environment, executionCtx throws an error, use empty object
    ctx = {};
  }

  // Delegate to original handler (requires as any for type compatibility)
  const response = await (originalHandler as any).fetch(request, env, ctx);
  return response as any;
});

export default app;
