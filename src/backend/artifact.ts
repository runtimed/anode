import { Env } from "./types.ts";
import { validateAuthPayload } from "./auth";

// Parse cookies from request headers
function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};

  return cookieHeader
    .split(";")
    .reduce((cookies: Record<string, string>, cookie) => {
      const [name, value] = cookie.trim().split("=");
      if (name && value) {
        cookies[name] = decodeURIComponent(value);
      }
      return cookies;
    }, {});
}

export default {
  fetch: async (
    request: Request,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<Response> => {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/artifacts")) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
        }),
        { status: 404 }
      );
    }

    // Don't process deletes
    if (request.method === "DELETE") {
      return new Response(
        JSON.stringify({
          error: "Method Not Allowed",
        }),
        { status: 405 }
      );
    }

    if (url.pathname === "/api/artifacts" && request.method === "POST") {
      console.log("✅ Handling POST request to /api/artifacts");

      const notebookId = request.headers.get("x-notebook-id");
      const authToken =
        request.headers.get("authorization")?.replace("Bearer ", "") ||
        request.headers.get("x-auth-token");
      const mimeType =
        request.headers.get("content-type") || "application/octet-stream";

      if (!authToken) {
        return new Response(
          JSON.stringify({
            error: "Unauthorized",
          }),
          { status: 401 }
        );
      }
      try {
        await validateAuthPayload({ authToken }, env, request);
      } catch (error) {
        return new Response(
          JSON.stringify({
            error: "Unauthorized",
          }),
          { status: 401 }
        );
      }
      // TODO: Validate the notebook ID
      // TODO: Validate that the user has permission to add artifacts to this notebook
      // TODO: Validate that the artifact name is unique within the notebook
      //
      // TODO: Compute hash of data on the fly
      // For now we'll just accept a random UUID as the artifact ID
      // TODO: Rely on multipart upload for large files
      const uuidv4 = () =>
        // @ts-ignore
        ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
          (
            c ^
            (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
          ).toString(16)
        );

      const artifactId = `${notebookId}/${uuidv4()}`;
      await env.ARTIFACT_BUCKET.put(artifactId, await request.arrayBuffer(), {
        httpMetadata: {
          contentType: mimeType,
        },
      });

      return new Response(JSON.stringify({ artifactId }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // Use cookies for authenticating GET requests (for images/artifacts)
    if (request.method === "GET") {
      // Extract the full artifact ID from the path after /api/artifacts/
      const artifactId = url.pathname.replace("/api/artifacts/", "");
      if (!artifactId) {
        return new Response(
          JSON.stringify({
            error: "Bad Request",
          }),
          { status: 400 }
        );
      }

      // Authenticate using cookies for GET requests
      const cookies = parseCookies(request.headers.get("cookie"));
      const authToken = cookies["auth_token"] || cookies["google_auth_token"];

      if (!authToken) {
        return new Response(
          JSON.stringify({
            error: "Unauthorized - No auth token in cookies",
          }),
          { status: 401 }
        );
      }

      try {
        await validateAuthPayload({ authToken }, env, request);
      } catch (error) {
        return new Response(
          JSON.stringify({
            error: "Unauthorized",
          }),
          { status: 401 }
        );
      }

      const artifact = await env.ARTIFACT_BUCKET.get(artifactId);
      if (!artifact) {
        return new Response(
          JSON.stringify({
            error: "Not Found",
          }),
          { status: 404 }
        );
      }

      const contentType =
        artifact.httpMetadata?.contentType || "application/octet-stream";

      return new Response(artifact.body, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": "true",
        },
      });
    }

    // Options and other pre-flight are fine
    // Since this endpoint is used for images as direct urls...
    if (request.method === "OPTIONS") {
      // Handle CORS preflight requests
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    return new Response(
      JSON.stringify({
        error: "Unknown Method",
      }),
      { status: 405 }
    );
  },
};
