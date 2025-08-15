import { Hono } from "hono";
import { cors } from "hono/cors";
import { WebSocketServer } from "./sync.ts";
import originalHandler from "./entry.ts";
import { type Env } from "./types.ts";
import { type AuthContext } from "./middleware.ts";
import { RuntError, ErrorType } from "./types.ts";
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

// Request logging middleware for Cloudflare
app.use("*", async (c, next) => {
  const start = Date.now();
  const method = c.req.method;
  const url = new URL(c.req.url);
  const path = url.pathname;

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  // Log format optimized for Cloudflare Workers logs
  console.log(`${method} ${path} ${status} ${duration}ms`);
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
