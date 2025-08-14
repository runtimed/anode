import { Hono } from "hono";
import { cors } from "hono/cors";
import { WebSocketServer } from "./sync.ts";
import originalHandler from "./entry.ts";
import { type Env } from "./types.ts";
import { type AuthContext } from "./middleware.ts";
import { RuntError, ErrorType } from "./types.ts";
import apiRoutes from "./routes.ts";
import localOidcRoutes from "./local-oidc-routes.ts";
import { createJWKSRouter, D1Driver } from "@japikey/cloudflare";

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

// JWKS endpoint using official japikey implementation
app.all("/api-keys/*", async (c) => {
  const url = new URL(c.req.url);

  // Check if this is a JWKS request
  if (url.pathname.includes("/.well-known/jwks.json")) {
    const db = new D1Driver(c.env.DB);
    await db.ensureTable(); // Initialize the database table

    const jwksRouter = createJWKSRouter({
      baseIssuer: new URL("http://localhost:8787/api-keys"),
      db,
      maxAgeSeconds: 300, // 5 minutes cache
    });

    // Handle test environment where executionCtx might not be available
    let ctx: any = {};
    try {
      ctx = c.executionCtx;
    } catch {
      // In test environment, executionCtx throws an error, use empty object
      ctx = {};
    }

    // Convert Hono request to Cloudflare Worker request format
    const cfRequest = c.req.raw as any;
    const response = await jwksRouter.fetch(cfRequest, c.env, ctx);

    // Convert response body
    const body = response.body ? await response.text() : "";

    // Set headers
    for (const [key, value] of response.headers.entries()) {
      c.header(key, value);
    }

    // Return using Hono context methods
    return c.text(body, response.status as 200 | 400 | 401 | 403 | 404 | 500);
  }

  // For non-JWKS requests, continue to next handler
  return c.text("Not Found", 404);
});

// Static asset serving - try to serve from ASSETS binding first (production/preview)
app.all("*", async (c) => {
  const url = new URL(c.req.url);

  // Check if this looks like a static asset request (not an API route)
  const isStaticAssetRequest =
    !url.pathname.startsWith("/api") &&
    !url.pathname.startsWith("/local_oidc") &&
    !url.pathname.startsWith("/api-keys");

  if (isStaticAssetRequest && c.env.ASSETS) {
    try {
      // Try to fetch from Cloudflare static assets (production/preview)
      const assetResponse = await c.env.ASSETS.fetch(c.req.raw as any);
      if (assetResponse.status !== 404) {
        return assetResponse;
      }
      // If 404, fall through to original handler
    } catch (error) {
      console.warn("Failed to fetch static asset from ASSETS binding:", error);
      // Fall through to original handler
    }
  } else if (isStaticAssetRequest && !c.env.ASSETS) {
    // Local development - ASSETS binding not available, delegate to original handler
    // (Vite dev server handles static assets locally)
    console.debug(
      "Static asset request in local dev, delegating to original handler"
    );
  }

  // Fall through to original handler for API routes or when assets fail/unavailable
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
