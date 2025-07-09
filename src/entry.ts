import syncWorker, { WebSocketServer } from "./backend/index.ts";

// The preview worker needs to re-export the Durable Object class
// so the Workers runtime can find and instantiate it.
export { WebSocketServer };

/**
 * The Env interface includes all bindings from the original sync worker,
 * plus the `ASSETS` binding for serving static assets.
 */
interface Env {
  // Bindings from the original sync worker configuration
  WEBSOCKET_SERVER: DurableObjectNamespace;
  DB: D1Database;

  // Secrets
  AUTH_TOKEN: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;

  // New binding for the preview worker to serve the frontend application
  ASSETS: Fetcher;

  // Bindings for the artifact service, as per artifact-service-design.md
  ARTIFACT_BUCKET: R2Bucket;
  ARTIFACT_STORAGE: "r2" | "local";
  ARTIFACT_THRESHOLD: string;
}

export default {
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
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    // Define the paths that should be handled by the backend API.
    // This includes the main sync endpoint and the artifacts API.
    const isApiRequest =
      url.pathname.startsWith("/api/") || url.pathname.startsWith("/livestore");

    if (isApiRequest) {
      // If it's an API request, delegate it to the imported sync worker's logic.
      // This allows us to reuse the existing backend code without modification.
      return syncWorker.fetch(request, env, ctx);
    } else {
      // Otherwise, assume it's a request for a static asset (HTML, CSS, JS, images, etc.).
      // The `env.ASSETS` fetcher is automatically provided by the Workers runtime
      // when an `assets` directory is configured in wrangler.toml.
      // It handles serving files, caching, and SPA-style routing fallbacks.
      return env.ASSETS.fetch(request);
    }
  },
};
