import {
  workerGlobals,
  type Env,
  type SimpleHandler,
  type WorkerRequest,
  type ExecutionContext,
  type WorkerResponse,
} from "./types.ts";
import { validateAuthPayload } from "./auth";

const handler: SimpleHandler = {
  fetch: async (
    request: WorkerRequest,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<WorkerResponse> => {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/artifacts")) {
      return new workerGlobals.Response(
        JSON.stringify({
          error: "Not Found",
        }),
        { status: 404 }
      );
    }

    // Don't process deletes
    if (request.method === "DELETE") {
      return new workerGlobals.Response(
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
        return new workerGlobals.Response(
          JSON.stringify({
            error: "Unauthorized",
          }),
          { status: 401 }
        );
      }
      try {
        await validateAuthPayload({ authToken }, env);
      } catch {
        return new workerGlobals.Response(
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

      return new workerGlobals.Response(JSON.stringify({ artifactId }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // TODO: Rely on cookies for authenticating the GET request
    // primarily so that images can be loaded without a token
    // _OR_ we set up a way to get presigned URLs that go into the
    // livestore sync

    // Check for a GET, then assume we're fetching it
    if (request.method === "GET") {
      // Extract the full artifact ID from the path after /api/artifacts/
      const artifactId = url.pathname.replace("/api/artifacts/", "");
      if (!artifactId) {
        return new workerGlobals.Response(
          JSON.stringify({
            error: "Bad Request",
          }),
          { status: 400 }
        );
      }

      const artifact = await env.ARTIFACT_BUCKET.get(artifactId);
      if (!artifact) {
        return new workerGlobals.Response(
          JSON.stringify({
            error: "Not Found",
          }),
          { status: 404 }
        );
      }

      const contentType =
        artifact.httpMetadata?.contentType || "application/octet-stream";

      return new workerGlobals.Response(artifact.body, {
        status: 200,
        headers: {
          "Content-Type": contentType,
        },
      });
    }

    // Options and other pre-flight are fine
    // Since this endpoint is used for images as direct urls...
    if (request.method === "OPTIONS") {
      // Handle CORS preflight requests
      return new workerGlobals.Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    return new workerGlobals.Response(
      JSON.stringify({
        error: "Unknown Method",
      }),
      { status: 405 }
    );
  },
};

export default handler;
