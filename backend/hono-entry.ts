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

// Catch-all handler - serve static assets or delegate to original handler
app.all("*", async (c) => {
  const url = new URL(c.req.url);

  console.log(`🔍 Catch-all handler for: ${url.pathname}`);
  console.log(`🔧 Environment: ${c.env.DEPLOYMENT_ENV}`);
  console.log(`📁 ASSETS binding available: ${!!c.env.ASSETS}`);

  // For static assets in production/preview, try ASSETS binding
  if (c.env.ASSETS) {
    console.log(`📄 Trying to serve from ASSETS: ${url.pathname}`);

    // For SPA routing, serve index.html for routes without file extensions
    const hasFileExtension =
      url.pathname.includes(".") && !url.pathname.endsWith("/");

    console.log(
      `🔍 Path analysis: hasFileExtension=${hasFileExtension}, pathname=${url.pathname}`
    );

    let assetRequest;
    let requestDescription;
    if (hasFileExtension || url.pathname === "/") {
      // Direct asset request or root path
      assetRequest = c.req.raw;
      requestDescription = `direct request for ${url.pathname}`;
    } else {
      // SPA route - serve index.html
      const indexUrl = new URL("/", url.origin);
      assetRequest = new Request(indexUrl.toString(), {
        method: c.req.method,
        headers: c.req.raw.headers,
      });
      requestDescription = `SPA route ${url.pathname} -> serving index.html`;
    }
    console.log(`📋 Asset request strategy: ${requestDescription}`);

    try {
      console.log(`🚀 Fetching from ASSETS binding...`);
      const assetResponse = await c.env.ASSETS.fetch(assetRequest as any);
      console.log(
        `✅ ASSETS response: ${assetResponse.status} ${assetResponse.statusText} for ${url.pathname}`
      );
      console.log(
        `📊 Response headers:`,
        Object.fromEntries(assetResponse.headers.entries())
      );

      if (assetResponse.status < 400) {
        console.log(`🎉 Serving successful asset response`);
        return assetResponse;
      } else {
        console.log(`❌ Asset not found or error: ${assetResponse.status}`);
        // Try to read response body for debugging
        try {
          const responseText = await assetResponse.text();
          console.log(`📄 Response body:`, responseText.substring(0, 200));
        } catch (e) {
          console.log(`⚠️ Could not read response body:`, e);
        }
      }
    } catch (error) {
      console.error("💥 ASSETS fetch failed:", error);
      console.error("Error details:", {
        name: error instanceof Error ? error.name : "Unknown",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  } else {
    console.log(`⚠️ No ASSETS binding available, skipping asset serving`);
  }

  // Fallback to original handler for API routes or when ASSETS fails
  console.log(`🔄 Delegating to original handler: ${url.pathname}`);

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
