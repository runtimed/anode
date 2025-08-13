import { Hono } from "hono";
import { authMiddleware, type AuthContext } from "./middleware.ts";
import { type Env } from "./types.ts";

const artifacts = new Hono<{ Bindings: Env; Variables: AuthContext }>();

// Auth applied per route - uploads need auth, downloads are public

// POST /api/artifacts - Upload artifact (requires auth)
artifacts.post("/", authMiddleware, async (c) => {
  console.log("✅ Handling POST request to /api/artifacts");

  const notebookId = c.req.header("x-notebook-id");
  const mimeType = c.req.header("content-type") || "application/octet-stream";

  if (!notebookId) {
    return c.json(
      {
        error: "Bad Request",
        message: "x-notebook-id header is required",
      },
      400
    );
  }

  try {
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
    await c.env.ARTIFACT_BUCKET.put(artifactId, await c.req.arrayBuffer(), {
      httpMetadata: {
        contentType: mimeType,
      },
    });

    return c.json({ artifactId });
  } catch (error) {
    console.error("❌ Artifact upload failed:", error);
    return c.json(
      {
        error: "Internal Server Error",
        message: "Failed to store artifact",
      },
      500
    );
  }
});

// GET /api/artifacts/* - Download artifact (public, no auth required)
// Handle any path after /api/artifacts/ to support compound IDs like notebookId/uuid
artifacts.get("/*", async (c) => {
  const url = new URL(c.req.url);
  // Extract the full artifact ID from the path after /api/artifacts/
  const artifactId = url.pathname.replace("/api/artifacts/", "");

  if (!artifactId) {
    return c.json(
      {
        error: "Bad Request",
        message: "Artifact ID is required",
      },
      400
    );
  }

  try {
    const artifact = await c.env.ARTIFACT_BUCKET.get(artifactId);
    if (!artifact) {
      return c.json(
        {
          error: "Not Found",
          message: "Artifact not found",
        },
        404
      );
    }

    const contentType =
      artifact.httpMetadata?.contentType || "application/octet-stream";

    return new Response(await artifact.arrayBuffer(), {
      status: 200,
      headers: {
        "Content-Type": contentType,
      },
    });
  } catch (error) {
    console.error("❌ Artifact retrieval failed:", error);
    return c.json(
      {
        error: "Internal Server Error",
        message: "Failed to retrieve artifact",
      },
      500
    );
  }
});

// OPTIONS - Handle CORS preflight requests
// Since this endpoint is used for images as direct urls...
artifacts.options("*", () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
});

// DELETE method not allowed
artifacts.delete("*", (c) => {
  return c.json({ error: "Method Not Allowed" }, 405);
});

// All other methods not allowed
artifacts.all("*", (c) => {
  return c.json({ error: "Unknown Method" }, 405);
});

export default artifacts;
