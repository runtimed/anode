import { Hono } from "hono";
import { v4 as uuidv4 } from "uuid";
import { authMiddleware, type AuthContext } from "./middleware.ts";
import { type Env } from "./types.ts";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./trpc/index.ts";

// Import unified API key routes
import apiKeyRoutes from "./api-key-routes.ts";
import {
  isUsingLocalProvider,
  validateProviderConfig,
} from "./providers/api-key-factory.ts";

const api = new Hono<{ Bindings: Env; Variables: AuthContext }>();

// tRPC endpoint
api.all("/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext: () => ({}),
  });
});

// Health endpoint - no auth required
api.get("/health", (c) => {
  // Validate provider configuration
  const providerValidation = validateProviderConfig(c.env);

  return c.json({
    status: "healthy",
    deployment_env: c.env.DEPLOYMENT_ENV,
    timestamp: new Date().toISOString(),
    framework: "hono",
    config: {
      has_auth_issuer: Boolean(c.env.AUTH_ISSUER),
      deployment_env: c.env.DEPLOYMENT_ENV,
      service_provider: c.env.SERVICE_PROVIDER || "local",
      using_local_provider: isUsingLocalProvider(c.env),
    },
    api_keys: {
      provider: providerValidation.provider,
      provider_valid: providerValidation.valid,
      provider_errors: providerValidation.errors,
    },
  });
});

// Me endpoint - returns authenticated user info
api.get("/me", authMiddleware, (c) => {
  const passport = c.get("passport");
  if (!passport) {
    return c.json({ error: "Authentication failed" }, 401);
  }
  return c.json({
    id: passport.user.id,
    email: passport.user.email,
    name: passport.user.name,
    givenName: passport.user.givenName,
    familyName: passport.user.familyName,
    isAnonymous: passport.user.isAnonymous,
  });
});

// Mount unified API key routes
api.route("/api-keys", apiKeyRoutes);

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
