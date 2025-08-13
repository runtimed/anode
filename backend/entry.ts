import syncWorker, { WebSocketServer } from "./sync.ts";
import {
  workerGlobals,
  type ExecutionContext,
  type WorkerRequest,
  type SimpleHandler,
  type WorkerResponse,
  ExportedHandler,
} from "./types.ts";

// The preview worker needs to re-export the Durable Object class
// so the Workers runtime can find and instantiate it.
export { WebSocketServer };

import { Env, IncomingRequestCfProperties } from "./types.ts";

// CORS middleware function
function addCorsHeaders(response: WorkerResponse): WorkerResponse {
  const newHeaders = new workerGlobals.Headers(response.headers);
  newHeaders.set("Access-Control-Allow-Origin", "*");
  newHeaders.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  newHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  return new workerGlobals.Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

function withCors(handler: SimpleHandler): SimpleHandler {
  return {
    fetch: async (
      request: WorkerRequest<unknown, IncomingRequestCfProperties<unknown>>,
      env: Env,
      ctx: ExecutionContext
    ): Promise<WorkerResponse> => {
      const response = await handler.fetch(request, env, ctx);
      return addCorsHeaders(response);
    },
  };
}

const handler: ExportedHandler<Env> = {
  /**
   * The main fetch handler for the all-in-one preview worker.
   * It routes requests to either the backend API (sync worker) or the
   * static asset server.
   * @param request - The incoming request.
   * @param env - The environment bindings.
   * @param ctx - The execution context.
   * @returns A promise that resolves to a Response.
   */
  async fetch(
    request: WorkerRequest<unknown, IncomingRequestCfProperties<unknown>>,
    env: Env,
    ctx: ExecutionContext
  ): Promise<WorkerResponse> {
    const url = new URL(request.url);

    console.log("🔍 Entry point request:", {
      method: request.method,
      pathname: url.pathname,
      searchParams: url.searchParams.toString(),
    });

    // Check if local auth is enabled
    const allowLocalAuth = env.ALLOW_LOCAL_AUTH === "true";

    // Security check: prevent local auth in production
    if (allowLocalAuth && env.DEPLOYMENT_ENV === "production") {
      return new workerGlobals.Response(
        JSON.stringify({
          error: "SECURITY_ERROR",
          message:
            "Local authentication cannot be enabled in production environments",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Define the paths that should be handled by the backend API.
    // This includes the main sync endpoint, artifacts API, health endpoint, and OIDC endpoints.
    const isApiRequest =
      url.pathname.startsWith("/api/") ||
      url.pathname.startsWith("/livestore") ||
      url.pathname === "/health" ||
      url.pathname.startsWith("/debug/") ||
      url.pathname === "/websocket" ||
      (allowLocalAuth && url.pathname.startsWith("/local_oidc"));

    console.log("🎯 Route decision:", {
      isApiRequest,
      isArtifactPath: url.pathname.startsWith("/api/artifacts"),
      allowLocalAuth,
    });

    if (isApiRequest) {
      // If it's an API request, delegate it to the imported sync worker's logic.
      // This allows us to reuse the existing backend code without modification.
      console.log("🔄 Routing to sync worker");
      return syncWorker.fetch(request, env, ctx);
    } else {
      // Otherwise, assume it's a request for a static asset (HTML, CSS, JS, images, etc.).
      // The `env.ASSETS` fetcher is automatically provided by the Workers runtime
      // when an `assets` directory is configured in wrangler.toml.
      // It handles serving files, caching, and SPA-style routing fallbacks.
      console.log("📄 Routing to assets");

      // In local development, ASSETS may not be available
      if (!env.ASSETS) {
        return new workerGlobals.Response(
          `
<!DOCTYPE html>
<html>
<head>
  <title>Anode Local Development</title>
  <style>
    body { font-family: system-ui; margin: 40px; line-height: 1.6; }
    .code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
  </style>
</head>
<body>
  <h1>Anode Backend Worker</h1>
  <p>The backend API is running at <span class="code">${url.origin}</span></p>
  <p>For the web client, run <span class="code">pnpm dev</span> in a separate terminal.</p>
  <h2>Available Endpoints:</h2>
  <ul>
    <li><a href="/health">GET /health</a> - Health check</li>

    <li><span class="code">WS /livestore</span> - LiveStore sync</li>
  </ul>
  ${!allowLocalAuth ? '<p><em>Local OIDC endpoints are disabled. Set ALLOW_LOCAL_AUTH="true" to enable them.</em></p>' : ""}
</body>
</html>
          `.trim(),
          {
            status: 200,
            headers: {
              "Content-Type": "text/html",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }

      // Handle SPA routing fallback
      // For client-side routes (no file extension), serve index.html
      // For static assets (with extensions), serve them directly
      const hasFileExtension =
        url.pathname.includes(".") && !url.pathname.endsWith("/");

      if (hasFileExtension) {
        // Static asset request - serve directly
        return env.ASSETS.fetch(request);
      } else {
        // Client-side route - serve index.html for SPA routing
        const indexRequest = new workerGlobals.Request(
          new URL("/", request.url),
          {
            method: request.method,
            headers: request.headers,
          }
        );
        return env.ASSETS.fetch(indexRequest);
      }
    }
  },
};

export default handler;
