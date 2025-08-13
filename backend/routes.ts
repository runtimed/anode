import { Hono } from "hono";
import { authMiddleware, type AuthContext } from "./middleware.ts";
import { type Env } from "./types.ts";

const artifacts = new Hono<{ Bindings: Env; Variables: AuthContext }>();

// Apply auth middleware to all artifact routes
artifacts.use("*", authMiddleware);

// POST /api/artifacts - Upload artifact
artifacts.post("/", async (c) => {
  console.log("✅ Handling POST request to /api/artifacts");

  const notebookId = c.req.header("x-notebook-id");
  const mimeType = c.req.header("content-type") || "application/octet-stream";
  const userId = c.get("userId");

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
    const body = await c.req.arrayBuffer();
    const bodySize = body.byteLength;

    console.log(`📤 Artifact upload: ${bodySize} bytes, type: ${mimeType}`);

    // Generate artifact ID
    const artifactId = crypto.randomUUID();

    // Determine storage method based on size threshold
    const threshold = parseInt(c.env.ARTIFACT_THRESHOLD || "16384", 10);
    const useR2 =
      bodySize > threshold &&
      c.env.ARTIFACT_STORAGE === "r2" &&
      c.env.ARTIFACT_BUCKET;

    if (useR2) {
      // Store in R2
      const key = `${notebookId}/${artifactId}`;
      await c.env.ARTIFACT_BUCKET.put(key, body, {
        httpMetadata: { contentType: mimeType },
      });

      // Store metadata in database
      await c.env.DB.prepare(
        `
        INSERT INTO artifacts (id, notebook_id, user_id, mime_type, size_bytes, storage_type, storage_key, created_at)
        VALUES (?, ?, ?, ?, ?, 'r2', ?, datetime('now'))
      `
      )
        .bind(artifactId, notebookId, userId, mimeType, bodySize, key)
        .run();

      console.log(`💾 Stored artifact ${artifactId} in R2 (${bodySize} bytes)`);
    } else {
      // Store inline in database (base64 encoded)
      const base64Data = btoa(String.fromCharCode(...new Uint8Array(body)));

      await c.env.DB.prepare(
        `
        INSERT INTO artifacts (id, notebook_id, user_id, mime_type, size_bytes, storage_type, data, created_at)
        VALUES (?, ?, ?, ?, ?, 'inline', ?, datetime('now'))
      `
      )
        .bind(artifactId, notebookId, userId, mimeType, bodySize, base64Data)
        .run();

      console.log(
        `💾 Stored artifact ${artifactId} inline (${bodySize} bytes)`
      );
    }

    return c.json({
      id: artifactId,
      url: `/api/artifacts/${artifactId}`,
      mimeType,
      size: bodySize,
      storageType: useR2 ? "r2" : "inline",
    });
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

// GET /api/artifacts/:id - Download artifact
artifacts.get("/:id", async (c) => {
  const artifactId = c.req.param("id");

  if (!artifactId) {
    return c.json(
      { error: "Bad Request", message: "Artifact ID is required" },
      400
    );
  }

  try {
    // Fetch artifact metadata
    const artifact = (await c.env.DB.prepare(
      `
      SELECT id, mime_type, size_bytes, storage_type, storage_key, data
      FROM artifacts
      WHERE id = ?
    `
    )
      .bind(artifactId)
      .first()) as {
      id: string;
      mime_type: string;
      size_bytes: number;
      storage_type: string;
      storage_key?: string;
      data?: string;
    } | null;

    if (!artifact) {
      return c.json({ error: "Not Found", message: "Artifact not found" }, 404);
    }

    console.log(
      `📥 Retrieving artifact ${artifactId} (${artifact.storage_type})`
    );

    let body: ArrayBuffer;

    if (
      artifact.storage_type === "r2" &&
      artifact.storage_key &&
      c.env.ARTIFACT_BUCKET
    ) {
      // Retrieve from R2
      const object = await c.env.ARTIFACT_BUCKET.get(artifact.storage_key);
      if (!object) {
        return c.json(
          { error: "Not Found", message: "Artifact data not found in storage" },
          404
        );
      }
      body = await object.arrayBuffer();
    } else if (artifact.storage_type === "inline" && artifact.data) {
      // Decode from base64
      const binaryString = atob(artifact.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      body = bytes.buffer;
    } else {
      return c.json(
        {
          error: "Internal Server Error",
          message: "Invalid storage configuration",
        },
        500
      );
    }

    // Return artifact with appropriate headers
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": artifact.mime_type,
        "Content-Length": artifact.size_bytes.toString(),
        "Cache-Control": "public, max-age=31536000", // 1 year cache
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

// GET /api/artifacts/health - Health check (already exists in main app)
artifacts.get("/health", (c) => {
  const userId = c.get("userId");
  const isRuntime = c.get("isRuntime");

  return c.json({
    status: "healthy",
    service: "artifacts",
    user_id: userId,
    is_runtime: isRuntime,
    storage: {
      has_db: Boolean(c.env.DB),
      has_r2: Boolean(c.env.ARTIFACT_BUCKET),
      threshold: c.env.ARTIFACT_THRESHOLD || "16384",
    },
  });
});

// DELETE method not allowed
artifacts.delete("*", (c) => {
  return c.json({ error: "Method Not Allowed" }, 405);
});

export default artifacts;
