import { Hono } from "hono";
import { v4 as uuidv4 } from "uuid";
import { authMiddleware, type AuthContext } from "./middleware.ts";
import { type Env } from "./types.ts";
import {
  createApiKeyRouter,
  D1Driver,
  type CreateApiKeyData,
  type ApiKeyRouterOptions,
} from "@japikey/cloudflare";
import { validateAuthPayload } from "./auth.ts";

// Import API key provider for authentication checks
import backendExtension from "@runtimed/extension_impl";
const { apiKey: apiKeyProvider } = backendExtension;

// Helper functions for japikey integration
const getUserIdFromRequest = async (
  request: any,
  _env: Env
): Promise<string> => {
  const authToken =
    request.headers.get("Authorization")?.replace("Bearer ", "") ||
    request.headers.get("x-auth-token");

  if (!authToken) {
    throw new Error("Missing auth token");
  }

  const validatedUser = await validateAuthPayload({ authToken }, _env);
  return validatedUser.id;
};

const parseCreateApiKeyRequest = async (
  request: any,
  _env: Env
): Promise<CreateApiKeyData> => {
  const body = await request.json();

  // Validate required fields
  if (!Array.isArray(body.scopes) || body.scopes.length === 0) {
    throw new Error("scopes is required and must be a non-empty array");
  }

  if (!body.expiresAt) {
    throw new Error("expiresAt is required");
  }

  if (typeof body.userGenerated !== "boolean") {
    throw new Error("userGenerated is required");
  }

  return {
    expiresAt: new Date(body.expiresAt),
    claims: {
      scopes: body.scopes,
      resources: body.resources || null,
    },
    databaseMetadata: {
      scopes: body.scopes,
      resources: body.resources || null,
      name: body.name || "Unnamed Key",
      userGenerated: body.userGenerated,
    },
  };
};

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

    // Test authentication - check API key first, then fallback to existing auth
    try {
      let tokenType = "Service Token";
      let authMethod = "Unknown";

      // Check if this is an API key first
      const apiKeyContext = {
        bearerToken: authToken,
        env: c.env,
        request: null as any, // Not used by the provider
        ctx: {} as any, // Not used by the provider
        passport: null, // Required by ProviderContext interface
      };

      if (apiKeyProvider.isApiKey(apiKeyContext)) {
        // Validate using API key provider
        await apiKeyProvider.validateApiKey(apiKeyContext);
        tokenType = "API Key";
        authMethod = "API Key Provider";
      } else {
        // Fall back to existing auth logic (OIDC JWT or service token)
        const { validateAuthPayload } = await import("./auth.ts");
        await validateAuthPayload({ authToken }, c.env);
        tokenType = authToken.startsWith("eyJ") ? "OIDC JWT" : "Service Token";
        authMethod = "Standard Auth";
      }

      return c.json({
        success: true,
        message: "Authentication successful",
        tokenType,
        authMethod,
        timestamp: new Date().toISOString(),
      });
    } catch (authError: any) {
      // Determine token type for error reporting
      let tokenType = "Service Token";
      if (authToken.startsWith("eyJ")) {
        // Check if it might be an API key JWT
        const apiKeyContext = {
          bearerToken: authToken,
          env: c.env,
          request: null as any,
          ctx: {} as any,
          passport: null, // Required by ProviderContext interface
        };
        tokenType = apiKeyProvider.isApiKey(apiKeyContext)
          ? "API Key"
          : "OIDC JWT";
      }

      return c.json(
        {
          error: "AUTHENTICATION_FAILED",
          message: authError.message,
          tokenType,
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

// API Key routes using official japikey implementation
const createJapikeyApiKeyRoutes = async (env: Env) => {
  const db = new D1Driver(env.DB);
  await db.ensureTable(); // Initialize the database table

  const options: ApiKeyRouterOptions<Env> = {
    getUserId: getUserIdFromRequest,
    parseCreateApiKeyRequest,
    issuer: new URL(`http://localhost:8787/api-keys`),
    aud: "api-keys",
    db,
    routePrefix: "/api/api-keys", // Match the actual URL path
  };

  return createApiKeyRouter(options);
};

// Mount the official japikey routes - handle all API key operations
api.all("/api-keys", async (c) => {
  const japikeyRouter = await createJapikeyApiKeyRoutes(c.env);
  // Convert Hono request to Cloudflare Worker request format
  const cfRequest = c.req.raw as any;
  const response = await japikeyRouter.fetch(cfRequest, c.env, c.executionCtx);

  // Convert response body
  const body = response.body ? await response.text() : "";

  // Set headers
  for (const [key, value] of response.headers.entries()) {
    c.header(key, value);
  }

  // Return using Hono context methods
  return c.text(body, response.status as 200 | 400 | 401 | 403 | 404 | 500);
});

api.all("/api-keys/*", async (c) => {
  const japikeyRouter = await createJapikeyApiKeyRoutes(c.env);
  // Convert Hono request to Cloudflare Worker request format
  const cfRequest = c.req.raw as any;
  const response = await japikeyRouter.fetch(cfRequest, c.env, c.executionCtx);

  // Convert response body
  const body = response.body ? await response.text() : "";

  // Set headers
  for (const [key, value] of response.headers.entries()) {
    c.header(key, value);
  }

  // Return using Hono context methods
  return c.text(body, response.status as 200 | 400 | 401 | 403 | 404 | 500);
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
