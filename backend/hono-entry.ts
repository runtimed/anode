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
import { isUsingLocalProvider } from "./providers/api-key-factory.ts";

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

// API Keys endpoint using official japikey implementation (local provider only)
app.all("/api-keys/*", async (c) => {
  // Only mount this endpoint for local provider
  if (!isUsingLocalProvider(c.env)) {
    return c.json({ error: "Not Found" }, 404);
  }
  const url = new URL(c.req.url);

  const db = new D1Driver(c.env.DB);
  await db.ensureTable(); // Initialize the database table

  let router;

  // Create appropriate router based on request type
  if (url.pathname.includes("/.well-known/jwks.json")) {
    router = createJWKSRouter({
      baseIssuer: new URL("http://localhost:8787/api-keys"),
      db,
      maxAgeSeconds: 300, // 5 minutes cache
    });
  } else {
    // For API key CRUD operations, create full API key router
    const { createApiKeyRouter } = await import("@japikey/cloudflare");
    router = createApiKeyRouter({
      getUserId: async () => "local-user", // Will be overridden by actual auth
      parseCreateApiKeyRequest: async (req) => {
        const body = (await req.json()) as any;
        return {
          expiresAt: new Date(body.expiresAt),
          claims: {
            scopes: body.scopes,
            resources: body.resources || null,
          },
          databaseMetadata: {
            scopes: body.scopes,
            resources: body.resources || null,
            name: body.name || "Unnamed Key",
            userGenerated: body.userGenerated || false,
            userId: "local-user", // Will be overridden
          },
        };
      },
      issuer: new URL("http://localhost:8787/api-keys"),
      aud: "api-keys",
      db,
      routePrefix: "/api-keys",
    });
  }

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
  const response = await router.fetch(cfRequest, c.env, ctx);

  // Convert response body
  const body = response.body ? await response.text() : "";

  // Set headers
  for (const [key, value] of response.headers.entries()) {
    c.header(key, value);
  }

  // Return using Hono context methods
  return c.text(body, response.status as 200 | 400 | 401 | 403 | 404 | 500);
});

// Catch-all handler - serve static assets or delegate to original handler
app.all("*", async (c) => {
  const url = new URL(c.req.url);

  // Handle WebSocket/livestore requests first - delegate directly to original handler
  if (
    url.pathname.startsWith("/livestore") ||
    url.pathname.startsWith("/websocket")
  ) {
    const request = c.req.raw as any;
    const env = c.env;

    // Handle test environment where executionCtx might not be available
    let ctx: any = {};
    try {
      ctx = c.executionCtx;
    } catch {
      ctx = {};
    }

    const response = await (originalHandler as any).fetch(request, env, ctx);
    return response as any;
  }

  // For static assets in production/preview, try ASSETS binding
  if (c.env.ASSETS) {
    // For SPA routing, serve index.html for routes without file extensions
    const hasFileExtension =
      url.pathname.includes(".") && !url.pathname.endsWith("/");

    let assetRequest;
    if (hasFileExtension || url.pathname === "/") {
      // Direct asset request or root path
      assetRequest = c.req.raw;
    } else {
      // SPA route - serve index.html
      const indexUrl = new URL("/", url.origin);
      assetRequest = new Request(indexUrl.toString(), {
        method: c.req.method,
        headers: c.req.raw.headers,
      });
    }

    try {
      const assetResponse = await c.env.ASSETS.fetch(assetRequest as any);

      if (assetResponse.status < 400) {
        return assetResponse;
      }
    } catch (error) {
      console.warn("ASSETS fetch failed:", error);
    }
  }

  // Fallback to original handler for API routes or when ASSETS fails

  const request = c.req.raw as any;
  const env = c.env;

  // Handle test environment where executionCtx might not be available
  let ctx: any = {};
  try {
    ctx = c.executionCtx;
  } catch {
    ctx = {};
  }

  const response = await (originalHandler as any).fetch(request, env, ctx);
  return response as any;
});

export default app;
