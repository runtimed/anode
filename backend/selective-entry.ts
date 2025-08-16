import { createSchema, createYoga } from "graphql-yoga";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { WebSocketServer } from "./sync.ts";
import originalHandler from "./entry.ts";
import {
  workerGlobals,
  type Env,
  type WorkerRequest,
  type WorkerResponse,
  type ExecutionContext,
} from "./types.ts";
import { type AuthContext } from "./middleware.ts";
import { RuntError, ErrorType } from "./types.ts";
import apiRoutes from "./routes.ts";
import localOidcRoutes from "./local-oidc-routes.ts";
import { validateAuthPayload, type ValidatedUser } from "./auth.ts";

// GraphQL Context type
interface GraphQLContext {
  auth?: ValidatedUser;
  env?: Env;
}

// Re-export the Durable Object class for the Workers runtime
export { WebSocketServer };

// ============================================================================
// GraphQL Yoga Setup (Native Worker)
// ============================================================================

const yoga = createYoga({
  schema: createSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        hello: String!
        me: User
        notebooks: [Notebook!]!
      }

      type User {
        id: String!
        email: String
        name: String
      }

      type Notebook {
        id: String!
        title: String
        createdAt: String!
      }

      type Mutation {
        createNotebook(title: String!): Notebook!
      }
    `,
    resolvers: {
      Query: {
        hello: () => "Hello from Anode GraphQL!",
        me: (_, __, context: GraphQLContext) => {
          if (!context.auth) {
            throw new Error("Authentication required");
          }
          return context.auth;
        },
        notebooks: (_, __, context: GraphQLContext) => {
          if (!context.auth) {
            throw new Error("Authentication required");
          }
          // Placeholder - would query actual notebooks
          return [
            {
              id: "notebook-1",
              title: "My First Notebook",
              createdAt: new Date().toISOString(),
            },
          ];
        },
      },
      Mutation: {
        createNotebook: (_, { title }, context: GraphQLContext) => {
          if (!context.auth) {
            throw new Error("Authentication required");
          }
          // Placeholder - would create actual notebook
          return {
            id: `notebook-${Date.now()}`,
            title,
            createdAt: new Date().toISOString(),
          };
        },
      },
    },
  }),
  // Enable CORS for GraphQL
  cors: {
    origin: "*",
    credentials: true,
  },
  // Custom context with auth
  context: async ({ request, env }: any): Promise<GraphQLContext> => {
    // Extract auth from request
    let auth: ValidatedUser | undefined = undefined;
    try {
      const authToken =
        request.headers.get("Authorization")?.replace("Bearer ", "") ||
        request.headers.get("X-Auth-Token");

      if (authToken && env) {
        const validatedUser = await validateAuthPayload(
          { authToken },
          env as Env
        );
        auth = validatedUser;
      }
    } catch (error) {
      console.warn("GraphQL auth extraction failed:", error);
      // Don't fail the request, just proceed without auth
    }

    return { auth, env: env as Env };
  },
});

// ============================================================================
// Hono App Setup (for existing routes)
// ============================================================================

const honoApp = new Hono<{ Bindings: Env; Variables: AuthContext }>();

// Global error handling middleware
honoApp.onError(async (error, c) => {
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
honoApp.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "x-notebook-id"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

// Request logging middleware
honoApp.use("*", async (c, next) => {
  const start = Date.now();
  const method = c.req.method;
  const url = new URL(c.req.url);
  const path = url.pathname;

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  console.log(`[HONO] ${method} ${path} ${status} ${duration}ms`);
});

// Environment-based security check middleware for local OIDC
honoApp.use("/local_oidc/*", async (c, next) => {
  const allowLocalAuth = c.env.ALLOW_LOCAL_AUTH === "true";

  if (!allowLocalAuth) {
    return c.json({ error: "Local OIDC is disabled" }, 403);
  }

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

// Mount existing routes
honoApp.route("/api", apiRoutes);
honoApp.route("/local_oidc", localOidcRoutes);

// ============================================================================
// Main Selective Router
// ============================================================================

export default {
  async fetch(
    request: WorkerRequest,
    env: Env,
    ctx: ExecutionContext
  ): Promise<WorkerResponse> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    console.log("🔍 Selective router:", {
      method: request.method,
      pathname,
      timestamp: new Date().toISOString(),
    });

    // Security check for local auth in production
    const allowLocalAuth = env.ALLOW_LOCAL_AUTH === "true";
    if (allowLocalAuth && env.DEPLOYMENT_ENV === "production") {
      return new workerGlobals.Response(
        JSON.stringify({
          error: "SECURITY_ERROR",
          message:
            "Local authentication cannot be enabled in production environments",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // CORS preflight handling
    if (request.method === "OPTIONS") {
      return new workerGlobals.Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // Route 1: GraphQL → Native Yoga handler
    if (pathname.startsWith("/graphql")) {
      console.log("🚀 Routing to GraphQL Yoga");
      try {
        const response = await yoga.fetch(request as any, env, ctx);
        console.log("✅ GraphQL response:", response.status);
        return response as unknown as WorkerResponse;
      } catch (error) {
        console.error("❌ GraphQL error:", error);
        return new workerGlobals.Response(
          JSON.stringify({
            error: "GraphQL processing failed",
            message: error instanceof Error ? error.message : String(error),
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Route 2: LiveStore/WebSocket → Original handler
    if (
      pathname.startsWith("/livestore") ||
      pathname.startsWith("/websocket") ||
      request.headers.get("upgrade") === "websocket"
    ) {
      console.log("🔄 Routing to LiveStore/WebSocket (original handler)");
      return originalHandler.fetch!(request as any, env, ctx);
    }

    // Route 3: API routes → Hono app
    if (
      pathname.startsWith("/api/") ||
      pathname === "/health" ||
      (allowLocalAuth && pathname.startsWith("/local_oidc"))
    ) {
      console.log("🛠️  Routing to Hono API");
      try {
        const response = await honoApp.fetch(request as any, env, ctx);
        console.log("✅ Hono API response:", response.status);
        return response as unknown as WorkerResponse;
      } catch (error) {
        console.error("❌ Hono API error:", error);
        throw error;
      }
    }

    // Route 4: Static assets → ASSETS binding or original handler
    console.log("📄 Routing to static assets");

    // Try ASSETS binding first (for production/preview)
    if (env.ASSETS) {
      try {
        const hasFileExtension =
          pathname.includes(".") && !pathname.endsWith("/");

        let assetRequest;
        if (hasFileExtension || pathname === "/") {
          // Direct asset request or root path
          assetRequest = request;
        } else {
          // SPA route - serve index.html
          const indexUrl = new URL("/", url.origin);
          assetRequest = new workerGlobals.Request(indexUrl.toString(), {
            method: request.method,
            headers: request.headers,
          });
        }

        const assetResponse = await env.ASSETS.fetch(assetRequest as any);

        if (assetResponse.status < 400) {
          console.log("✅ ASSETS response:", assetResponse.status);
          return assetResponse;
        }
      } catch (error) {
        console.warn("❌ ASSETS fetch failed:", error);
      }
    }

    // Fallback to original handler
    console.log("🔄 Falling back to original handler");
    return originalHandler.fetch!(request as any, env, ctx);
  },
};
