import { Hono } from "hono";
import { v4 as uuidv4 } from "uuid";
import { authMiddleware, type AuthContext } from "./middleware.ts";
import { type Env } from "./types.ts";
import apiKeyProvider from "./local_extension/api_key_provider.ts";
import {
  ApiKeyCapabilities,
  CreateApiKeyRequest,
} from "@runtimed/extensions/providers/api_key";
import { RuntError } from "@runtimed/extensions";

const api = new Hono<{ Bindings: Env; Variables: AuthContext }>();

// Health endpoint - no auth required
api.get("/health", (c) => {
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

// Debug auth endpoint - no auth middleware, handles auth internally
api.post("/debug/auth", async (c) => {
  console.log("🔧 Debug auth endpoint called");

  try {
    const body = (await c.req.json()) as { authToken?: string };
    const authToken = body.authToken;

    if (!authToken) {
      return c.json(
        {
          error: "MISSING_AUTH_TOKEN",
          message: "No authToken provided in request body",
          timestamp: new Date().toISOString(),
        },
        400
      );
    }

    // Test authentication using the existing auth system
    const { validateAuthPayload } = await import("./auth.ts");

    try {
      await validateAuthPayload({ authToken }, c.env);
      return c.json({
        success: true,
        message: "Authentication successful",
        tokenType: authToken.startsWith("eyJ") ? "OIDC JWT" : "Service Token",
        timestamp: new Date().toISOString(),
      });
    } catch (authError: any) {
      return c.json(
        {
          error: "AUTHENTICATION_FAILED",
          message: authError.message,
          tokenType: authToken.startsWith("eyJ") ? "OIDC JWT" : "Service Token",
          timestamp: new Date().toISOString(),
          hasAuthToken: Boolean(c.env.AUTH_TOKEN),
          hasAuthIssuer: Boolean(c.env.AUTH_ISSUER),
        },
        401
      );
    }
  } catch {
    return c.json(
      {
        error: "INVALID_REQUEST",
        message: "Invalid JSON in request body",
        timestamp: new Date().toISOString(),
      },
      400
    );
  }
});

// API Key routes - all require authentication
api.post("/api-keys", authMiddleware, async (c) => {
  try {
    const body = (await c.req.json()) as CreateApiKeyRequest;

    // Validate request
    if (
      !Array.isArray(body.scopes) ||
      body.scopes.length === 0 ||
      body.scopes.some((scope) => typeof scope !== "string")
    ) {
      return c.json(
        {
          error: "INVALID_REQUEST",
          message: "scopes is invalid",
        },
        400
      );
    }

    const context = {
      env: c.env,
      user: { id: c.get("userId") },
      passport: c.get("passport"),
    };

    // TODO: Fix type compatibility for context parameter
    const result = await apiKeyProvider.createApiKey(context as any, body);
    return c.json(result);
  } catch (error: any) {
    if (error instanceof RuntError) {
      // TODO: Fix type compatibility between RuntError.statusCode and Hono status codes
      return c.json(
        { error: error.type, message: error.message },
        error.statusCode as any
      );
    }
    return c.json(
      { error: "INTERNAL_ERROR", message: "Failed to create API key" },
      500
    );
  }
});

api.get("/api-keys", authMiddleware, async (c) => {
  try {
    const limit = parseInt(c.req.query("limit") || "100");
    const offset = parseInt(c.req.query("offset") || "0");

    const context = {
      env: c.env,
      user: { id: c.get("userId") },
      passport: c.get("passport"),
    };

    // TODO: Fix type compatibility for context parameter
    const result = await apiKeyProvider.listApiKeys(context as any, {
      limit,
      offset,
    });
    return c.json(result);
  } catch (error: any) {
    if (error instanceof RuntError) {
      // TODO: Fix type compatibility between RuntError.statusCode and Hono status codes
      return c.json(
        { error: error.type, message: error.message },
        error.statusCode as any
      );
    }
    return c.json(
      { error: "INTERNAL_ERROR", message: "Failed to list API keys" },
      500
    );
  }
});

api.get("/api-keys/:id", authMiddleware, async (c) => {
  try {
    const keyId = c.req.param("id");
    if (!keyId) {
      return c.json(
        { error: "INVALID_REQUEST", message: "API key ID is required" },
        400
      );
    }

    const context = {
      env: c.env,
      user: { id: c.get("userId") },
      passport: c.get("passport"),
    };

    // TODO: Fix type compatibility for context parameter
    const result = await apiKeyProvider.getApiKey(context as any, keyId);
    return c.json(result);
  } catch (error: any) {
    if (error instanceof RuntError) {
      // TODO: Fix type compatibility between RuntError.statusCode and Hono status codes
      return c.json(
        { error: error.type, message: error.message },
        error.statusCode as any
      );
    }
    return c.json(
      { error: "INTERNAL_ERROR", message: "Failed to get API key" },
      500
    );
  }
});

api.delete("/api-keys/:id", authMiddleware, async (c) => {
  try {
    const keyId = c.req.param("id");
    if (!keyId) {
      return c.json(
        { error: "INVALID_REQUEST", message: "API key ID is required" },
        400
      );
    }

    const context = {
      env: c.env,
      user: { id: c.get("userId") },
      passport: c.get("passport"),
    };

    // TODO: Fix type compatibility for context parameter
    await apiKeyProvider.deleteApiKey(context as any, keyId);
    return c.json({ success: true });
  } catch (error: any) {
    if (error instanceof RuntError) {
      // TODO: Fix type compatibility between RuntError.statusCode and Hono status codes
      return c.json(
        { error: error.type, message: error.message },
        error.statusCode as any
      );
    }
    return c.json(
      { error: "INTERNAL_ERROR", message: "Failed to delete API key" },
      500
    );
  }
});

api.patch("/api-keys/:id", authMiddleware, async (c) => {
  try {
    const keyId = c.req.param("id");
    if (!keyId) {
      return c.json(
        { error: "INVALID_REQUEST", message: "API key ID is required" },
        400
      );
    }

    if (!apiKeyProvider.capabilities.has(ApiKeyCapabilities.Revoke)) {
      return c.json(
        {
          error: "CAPABILITY_NOT_AVAILABLE",
          message: "Revoke capability is not supported",
        },
        501
      );
    }

    const context = {
      env: c.env,
      user: { id: c.get("userId") },
      passport: c.get("passport"),
    };

    // TODO: Fix type compatibility for context parameter
    await apiKeyProvider.revokeApiKey(context as any, keyId);
    return c.json({ success: true, message: "API key revoked successfully" });
  } catch (error: any) {
    if (error instanceof RuntError) {
      // TODO: Fix type compatibility between RuntError.statusCode and Hono status codes
      return c.json(
        { error: error.type, message: error.message },
        error.statusCode as any
      );
    }
    return c.json(
      { error: "INTERNAL_ERROR", message: "Failed to revoke API key" },
      500
    );
  }
});

// Artifact routes - Auth applied per route - uploads need auth, downloads are public

// POST /artifacts - Upload artifact (requires auth)
api.post("/artifacts", authMiddleware, async (c) => {
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
    // TODO: Compute hash of data on the fly
    // TODO: Rely on multipart upload for large files

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

// GET /artifacts/* - Download artifact (public, no auth required)
// Handle any path after /artifacts/ to support compound IDs like notebookId/uuid
api.get("/artifacts/*", async (c) => {
  const url = new URL(c.req.url);
  // Extract the artifact ID from the path after /artifacts/
  const pathMatch = url.pathname.match(/\/artifacts\/(.+)$/);
  const artifactId = pathMatch ? pathMatch[1] : "";

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

// OPTIONS - Handle CORS preflight requests for artifacts
api.options("/artifacts/*", () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
});

// DELETE method not allowed for artifacts
api.delete("/artifacts/*", (c) => {
  return c.json({ error: "Method Not Allowed" }, 405);
});

// All other artifact methods not allowed
api.all("/artifacts/*", (c) => {
  return c.json({ error: "Unknown Method" }, 405);
});

export default api;
