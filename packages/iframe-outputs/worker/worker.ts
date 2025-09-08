/**
 * Iframe Output Worker
 *
 * Serves isolated iframe content for rendering user-generated HTML/SVG
 * with appropriate security headers and CORS configuration.
 */

interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<Response> {
    if (!env.ASSETS) {
      throw new Error("ASSETS binding not configured");
    }

    // Always serve index.html regardless of the path
    // This ensures the iframe always loads the same content handler
    const indexRequest = new Request(new URL("/index.html", request.url), {
      method: request.method,
      headers: request.headers,
    });

    try {
      // Fetch index.html from assets
      const response = await env.ASSETS.fetch(indexRequest);

      if (!response.ok) {
        return new Response("Not Found", { status: 404 });
      }

      // Clone the response so we can modify headers
      const modifiedResponse = new Response(response.body, response);

      // Set security headers
      modifiedResponse.headers.set("X-Content-Type-Options", "nosniff");
      modifiedResponse.headers.set("X-Frame-Options", "ALLOWALL"); // Allow embedding
      modifiedResponse.headers.set(
        "Content-Security-Policy",
        "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; frame-ancestors *;"
      );

      // Set CORS headers to allow cross-origin communication
      modifiedResponse.headers.set("Access-Control-Allow-Origin", "*");
      modifiedResponse.headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, OPTIONS"
      );
      modifiedResponse.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type"
      );

      // Cache control - don't cache to ensure fresh content
      modifiedResponse.headers.set(
        "Cache-Control",
        "no-cache, no-store, must-revalidate"
      );

      return modifiedResponse;
    } catch (error) {
      console.error("Error serving iframe content:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
};
