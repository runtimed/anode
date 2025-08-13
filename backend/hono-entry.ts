import { Hono } from "hono";
import { cors } from "hono/cors";
import { WebSocketServer } from "./sync.ts";
import originalHandler from "./entry.ts";
import { type Env } from "./types.ts";
import { type AuthContext } from "./middleware.ts";
import artifactRoutes from "./routes.ts";

// Re-export the Durable Object class for the Workers runtime
export { WebSocketServer };

// Create a simple Hono app for middleware
const app = new Hono<{ Bindings: Env; Variables: AuthContext }>();

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

// Enhanced health endpoint
app.get("/health", (c) => {
  return c.json({
    status: "healthy",
    deployment_env: c.env.DEPLOYMENT_ENV,
    timestamp: new Date().toISOString(),
    framework: "hono",
    config: {
      has_auth_token: Boolean(c.env.AUTH_TOKEN),
      has_auth_issuer: Boolean(c.env.AUTH_ISSUER),
      deployment_env: c.env.DEPLOYMENT_ENV,
    },
  });
});

// Mount artifact routes
app.route("/api/artifacts", artifactRoutes);

// Catch-all route that delegates to original handler
app.all("*", async (c) => {
  // Convert to original Cloudflare Worker format (type incompatibility requires as any)
  const request = c.req.raw as any;
  const env = c.env;
  const ctx = c.executionCtx as any;

  // Delegate to original handler (requires as any for type compatibility)
  const response = await (originalHandler as any).fetch(request, env, ctx);
  return response as any;
});

export default app;
