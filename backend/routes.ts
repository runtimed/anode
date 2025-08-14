import { Hono } from "hono";
import { v4 as uuidv4 } from "uuid";
import { authMiddleware, type AuthContext } from "./middleware.ts";
import { type Env } from "./types.ts";
import apiKeyProvider from "./local_extension/api_key_provider.ts";
import {
  ApiKeyCapabilities,
  CreateApiKeyRequest,
} from "@runtimed/extensions/providers/api_key";
import {
  RuntError,
  ErrorType,
  AuthenticatedProviderContext,
} from "@runtimed/extensions";
import { ListApiKeysRequest } from "@runtimed/extensions/providers/api_key";

// Validation functions for API key requests
const validateCreateApiKeyRequest = (
  body: unknown
): body is CreateApiKeyRequest => {
  if (typeof body !== "object" || body === null) {
    throw new RuntError(ErrorType.InvalidRequest, {
      message: "Request body must be an object",
    });
  }

  const request = body as Record<string, unknown>;

  if (
    !Array.isArray(request.scopes) ||
    request.scopes.length === 0 ||
    request.scopes.some((scope) => typeof scope !== "string")
  ) {
    throw new RuntError(ErrorType.InvalidRequest, {
      message: "scopes is invalid",
    });
  }

  if (request.resources !== undefined) {
    if (
      !Array.isArray(request.resources) ||
      request.resources.some(
        (resource) =>
          typeof resource?.id !== "string" || typeof resource?.type !== "string"
      )
    ) {
      throw new RuntError(ErrorType.InvalidRequest, {
        message: "resources is invalid",
      });
    }

    if (
      !apiKeyProvider.capabilities.has(ApiKeyCapabilities.CreateWithResources)
    ) {
      throw new RuntError(ErrorType.CapabilityNotAvailable, {
        message: "Creating api keys with resources is not supported",
      });
    }
  }

  if (typeof request.expiresAt !== "string") {
    throw new RuntError(ErrorType.InvalidRequest, {
      message: "expiresAt is invalid",
    });
  }
  try {
    new Date(request.expiresAt);
  } catch (error) {
    throw new RuntError(ErrorType.InvalidRequest, {
      message: "expiresAt is invalid",
      cause: error as Error,
    });
  }

  if (request.name !== undefined && typeof request.name !== "string") {
    throw new RuntError(ErrorType.InvalidRequest, {
      message: "name is invalid",
    });
  }

  if (typeof request.userGenerated !== "boolean") {
    throw new RuntError(ErrorType.InvalidRequest, {
      message: "userGenerated is invalid",
    });
  }
  return true;
};

const validateRevokeApiKeyRequest = (
  body: unknown
): body is { revoked: boolean } => {
  if (typeof body !== "object" || body === null) {
    throw new RuntError(ErrorType.InvalidRequest, {
      message: "Request body must be an object",
    });
  }
  const request = body as Record<string, unknown>;

  if (typeof request.revoked !== "boolean" || request.revoked !== true) {
    throw new RuntError(ErrorType.InvalidRequest, {
      message: "invalid revoked value",
    });
  }
  return true;
};

const createAuthenticatedContext = (
  _userId: string,
  passport: any,
  env: Env
): AuthenticatedProviderContext => {
  return {
    request: null as any, // Not used by the provider
    env,
    ctx: {} as any, // Not used by the provider
    bearerToken: "", // Not needed for this context
    passport,
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

// API Key routes - all require authentication
api.post("/api-keys", authMiddleware, async (c) => {
  const body = await c.req.json();

  // Comprehensive validation
  validateCreateApiKeyRequest(body);

  const userId = c.get("userId");
  const passport = c.get("passport");

  if (!userId || !passport) {
    throw new RuntError(ErrorType.MissingAuthToken, {
      message: "Authentication required",
    });
  }

  const context = createAuthenticatedContext(userId, passport, c.env);
  const result = await apiKeyProvider.createApiKey(
    context,
    body as CreateApiKeyRequest
  );
  return c.json(result);
});

api.get("/api-keys", authMiddleware, async (c) => {
  const limitStr = c.req.query("limit");
  const offsetStr = c.req.query("offset");
  const options: ListApiKeysRequest = {};

  // Parse pagination parameters
  try {
    if (limitStr) {
      options.limit = parseInt(limitStr);
    }
    if (offsetStr) {
      options.offset = parseInt(offsetStr);
    }
  } catch (error) {
    throw new RuntError(ErrorType.InvalidRequest, {
      message: "Invalid pagination parameters",
      cause: error as Error,
    });
  }

  const userId = c.get("userId");
  const passport = c.get("passport");

  if (!userId || !passport) {
    throw new RuntError(ErrorType.MissingAuthToken, {
      message: "Authentication required",
    });
  }

  const context = createAuthenticatedContext(userId, passport, c.env);
  const result = await apiKeyProvider.listApiKeys(context, options);
  return c.json(result);
});

api.get("/api-keys/:id", authMiddleware, async (c) => {
  const keyId = c.req.param("id");
  if (!keyId) {
    throw new RuntError(ErrorType.InvalidRequest, {
      message: "API key ID is required",
    });
  }

  const userId = c.get("userId");
  const passport = c.get("passport");

  if (!userId || !passport) {
    throw new RuntError(ErrorType.MissingAuthToken, {
      message: "Authentication required",
    });
  }

  const context = createAuthenticatedContext(userId, passport, c.env);
  const result = await apiKeyProvider.getApiKey(context, keyId);
  return c.json(result);
});

api.delete("/api-keys/:id", authMiddleware, async (c) => {
  const keyId = c.req.param("id");
  if (!keyId) {
    throw new RuntError(ErrorType.InvalidRequest, {
      message: "API key ID is required",
    });
  }

  const userId = c.get("userId");
  const passport = c.get("passport");

  if (!userId || !passport) {
    throw new RuntError(ErrorType.MissingAuthToken, {
      message: "Authentication required",
    });
  }

  const context = createAuthenticatedContext(userId, passport, c.env);
  await apiKeyProvider.deleteApiKey(context, keyId);
  return new Response(null, { status: 204 });
});

api.patch("/api-keys/:id", authMiddleware, async (c) => {
  const keyId = c.req.param("id");
  if (!keyId) {
    throw new RuntError(ErrorType.InvalidRequest, {
      message: "API key ID is required",
    });
  }

  if (!apiKeyProvider.capabilities.has(ApiKeyCapabilities.Revoke)) {
    throw new RuntError(ErrorType.CapabilityNotAvailable, {
      message: "Revoke capability is not supported",
    });
  }

  const body = await c.req.json();
  validateRevokeApiKeyRequest(body);

  const userId = c.get("userId");
  const passport = c.get("passport");

  if (!userId || !passport) {
    throw new RuntError(ErrorType.MissingAuthToken, {
      message: "Authentication required",
    });
  }

  const context = createAuthenticatedContext(userId, passport, c.env);
  await apiKeyProvider.revokeApiKey(context, keyId);
  return new Response(null, { status: 204 });
});

// JWKS endpoint for individual API key validation - no auth required (public keys)
api.get("/api-keys/:id/.well-known/jwks.json", async (c) => {
  try {
    const keyId = c.req.param("id");

    if (!keyId) {
      return c.json(
        {
          error: "Bad Request",
          message: "Key ID is required",
        },
        400
      );
    }

    // Get the specific API key's public key directly from D1
    const result = await c.env.DB.prepare(
      "SELECT kid, jwk FROM japikeys WHERE kid = ? AND revoked = 0"
    )
      .bind(keyId)
      .first();

    if (!result) {
      return c.json(
        {
          error: "Not Found",
          message: "API key not found or revoked",
        },
        404
      );
    }

    const jwks = {
      keys: [
        {
          ...JSON.parse(result.jwk as string),
          kid: result.kid,
          use: "sig",
          alg: "RS256",
        },
      ],
    };

    return c.json(jwks);
  } catch (error) {
    console.error("❌ JWKS endpoint error:", error);
    return c.json(
      {
        error: "Internal Server Error",
        message: "Failed to retrieve public key",
      },
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
