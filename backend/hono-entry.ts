import { Hono } from "hono";
import { cors } from "hono/cors";
import { WebSocketServer } from "./sync.ts";
import originalHandler from "./entry.ts";

import { type Env } from "./types.ts";

// Re-export the Durable Object class for the Workers runtime
export { WebSocketServer };

// Create a simple Hono app for middleware
const app = new Hono<{ Bindings: Env }>();

// Global CORS middleware
app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
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

// Catch-all route that delegates to original handler
app.all("*", async (c) => {
  // Convert Hono context back to original Cloudflare Worker format
  const request = c.req.raw as any;
  const env = c.env;
  const ctx = c.executionCtx as any;

  // Delegate to original handler logic - bypass type checking
  const response = await (originalHandler as any).fetch(request, env, ctx);
  return response as any;
});

export default app;
