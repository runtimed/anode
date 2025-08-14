import * as jose from "jose";
import {
  createApiKeyRouter,
  D1Driver,
  type CreateApiKeyData,
  type ApiKeyRouterOptions,
} from "@japikey/cloudflare";
import type {
  ApiKeyProvider,
  ProviderContext,
  AuthenticatedProviderContext,
  CreateApiKeyRequest,
  ApiKey,
  ListApiKeysRequest,
  Scope,
} from "../api-key-provider.ts";
import { ApiKeyCapabilities } from "../api-key-provider.ts";
import { RuntError, ErrorType, type Env } from "../types.ts";
import { type Passport, type ValidatedUser } from "../auth.ts";

/**
 * Local API key provider for development environments
 * Uses japikey for actual key management and validation
 */
export class LocalApiKeyProvider implements ApiKeyProvider {
  public capabilities = new Set([
    ApiKeyCapabilities.Delete,
    ApiKeyCapabilities.CreateWithResources,
    ApiKeyCapabilities.ListKeysPaginated,
  ]);

  private db: D1Driver;
  private baseIssuer: URL;

  constructor(env: Env) {
    this.db = new D1Driver(env.DB);
    this.baseIssuer = new URL("http://localhost:8787/api-keys");
  }

  async ensureInitialized(): Promise<void> {
    await this.db.ensureTable();
  }

  /**
   * Check if a token appears to be an API key (vs OIDC token)
   */
  isApiKey(context: ProviderContext): boolean {
    if (!context.bearerToken) {
      return false;
    }

    try {
      const unverified = jose.decodeJwt(context.bearerToken);
      // japikey tokens have specific structure - check for key ID in subject and audience
      return Boolean(
        unverified.sub &&
          unverified.iss &&
          unverified.aud === "api-keys" &&
          typeof unverified.sub === "string" &&
          unverified.sub.match(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          ) // UUID format
      );
    } catch {
      return false;
    }
  }

  /**
   * Validate an API key and return passport
   */
  async validateApiKey(context: ProviderContext): Promise<Passport> {
    if (!context.bearerToken) {
      throw new RuntError(ErrorType.MissingAuthToken);
    }

    await this.ensureInitialized();

    try {
      const unverified = jose.decodeJwt(context.bearerToken);

      if (!unverified.sub || !unverified.iss || unverified.aud !== "api-keys") {
        throw new RuntError(ErrorType.AuthTokenInvalid, {
          message: "Invalid API key format",
          debugPayload: { decodedToken: unverified },
        });
      }

      // Extract key ID from subject
      const keyId = unverified.sub as string;

      // Get JWKS URL from issuer
      const jwksUrl = `${unverified.iss}/${keyId}/.well-known/jwks.json`;

      try {
        // Fetch JWKS and verify signature
        const JWKS = jose.createRemoteJWKSet(new URL(jwksUrl));
        const { payload } = await jose.jwtVerify(context.bearerToken, JWKS, {
          issuer: unverified.iss as string,
          audience: "api-keys",
        });

        // Extract scopes and other data from payload
        const userId = `local-${keyId}`; // Synthetic user ID for local development

        const user: ValidatedUser = {
          id: userId,
          email: `${userId}@local.dev`,
          name: "Local API Key User",
          givenName: "Local",
          familyName: "User",
          isAnonymous: false,
        };

        return {
          user,
          jwt: payload,
        };
      } catch (verificationError) {
        if (verificationError instanceof jose.errors.JWTExpired) {
          throw new RuntError(ErrorType.AuthTokenExpired, {
            message: "API key expired",
            debugPayload: { keyId },
          });
        }
        throw new RuntError(ErrorType.AuthTokenInvalid, {
          message: "API key verification failed",
          debugPayload: { keyId },
          cause: verificationError as Error,
        });
      }
    } catch (error) {
      if (error instanceof RuntError) {
        throw error;
      }
      throw new RuntError(ErrorType.AuthTokenInvalid, {
        message: "Failed to parse API key",
        cause: error as Error,
      });
    }
  }

  /**
   * Create a new API key
   */
  async createApiKey(
    context: AuthenticatedProviderContext,
    request: CreateApiKeyRequest
  ): Promise<string> {
    await this.ensureInitialized();

    // Map internal scopes to what japikey expects
    const mappedScopes = request.scopes.map((scope) => scope as string);

    const createData: CreateApiKeyData = {
      expiresAt: new Date(request.expiresAt),
      claims: {
        scopes: mappedScopes,
        resources: request.resources || null,
      },
      databaseMetadata: {
        scopes: mappedScopes,
        resources: request.resources || null,
        name: request.name || "Unnamed Key",
        userGenerated: request.userGenerated,
        userId: context.passport.user.id,
      },
    };

    try {
      // Use japikey to create the key
      const options: ApiKeyRouterOptions<Env> = {
        getUserId: async () => context.passport.user.id,
        parseCreateApiKeyRequest: async () => createData,
        issuer: this.baseIssuer,
        aud: "api-keys",
        db: this.db,
        routePrefix: "/api/api-keys",
      };

      const router = createApiKeyRouter(options);

      // Create a mock request for japikey
      const mockRequest = new Request(`${this.baseIssuer}/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${context.bearerToken}`,
        },
        body: JSON.stringify(request),
      }) as any;

      const response = await router.fetch(mockRequest, context.env, {
        waitUntil: () => {},
        passThroughOnException: () => {},
      } as any);

      if (!response.ok) {
        const errorText = await response.text();
        throw new RuntError(ErrorType.Unknown, {
          message: "Failed to create API key",
          responsePayload: { upstreamCode: response.status },
          debugPayload: { upstreamBody: errorText },
        });
      }

      const result = (await response.json()) as any;
      return result.api_key || result;
    } catch (error) {
      if (error instanceof RuntError) {
        throw error;
      }
      throw new RuntError(ErrorType.Unknown, {
        message: "Failed to create API key",
        cause: error as Error,
      });
    }
  }

  /**
   * Get a specific API key by ID
   */
  async getApiKey(
    context: AuthenticatedProviderContext,
    id: string
  ): Promise<ApiKey> {
    await this.ensureInitialized();

    try {
      // Query the japikey database directly
      const result = await this.db.getApiKey(id);

      if (!result) {
        throw new RuntError(ErrorType.NotFound, {
          message: "API key not found",
          debugPayload: { keyId: id },
        });
      }

      // Verify ownership
      const metadata = result.metadata as any;
      if (metadata?.userId !== context.passport.user.id) {
        throw new RuntError(ErrorType.AccessDenied, {
          message: "API key does not belong to authenticated user",
          debugPayload: { keyId: id, userId: context.passport.user.id },
        });
      }

      // Convert database result to ApiKey format
      const apiKey: ApiKey = {
        id,
        userId: context.passport.user.id,
        scopes: (metadata?.scopes || []).map((scope: string) => scope as Scope),
        resources: metadata?.resources || undefined,
        expiresAt:
          (result as any).expiresAt?.toISOString() || new Date().toISOString(),
        name: metadata?.name || undefined,
        userGenerated: metadata?.userGenerated || false,
        revoked: false, // japikey doesn't have revocation concept
      };

      return apiKey;
    } catch (error) {
      if (error instanceof RuntError) {
        throw error;
      }
      throw new RuntError(ErrorType.Unknown, {
        message: "Failed to get API key",
        cause: error as Error,
        debugPayload: { keyId: id },
      });
    }
  }

  /**
   * List all API keys for a user
   */
  async listApiKeys(
    context: AuthenticatedProviderContext,
    request: ListApiKeysRequest
  ): Promise<ApiKey[]> {
    await this.ensureInitialized();

    try {
      // Query the japikey database for user's keys
      // Note: D1Driver doesn't have a listApiKeys method, so we'll use a direct query
      const stmt = (this.db as any).db.prepare(`
        SELECT id, metadata, expiresAt FROM api_keys
        WHERE JSON_EXTRACT(metadata, '$.userId') = ?
        ORDER BY id DESC
        LIMIT ? OFFSET ?
      `);
      const results = await stmt
        .bind(
          context.passport.user.id,
          request.limit || 50,
          request.offset || 0
        )
        .all();

      const apiKeys: ApiKey[] = (results.results || []).map((result: any) => {
        const metadata = JSON.parse(result.metadata || "{}");
        return {
          id: result.id,
          userId: context.passport.user.id,
          scopes: (metadata?.scopes || []).map(
            (scope: string) => scope as Scope
          ),
          resources: metadata?.resources || undefined,
          expiresAt: result.expiresAt || new Date().toISOString(),
          name: metadata?.name || undefined,
          userGenerated: metadata?.userGenerated || false,
          revoked: false, // japikey doesn't have revocation concept
        };
      });

      return apiKeys;
    } catch (error) {
      throw new RuntError(ErrorType.Unknown, {
        message: "Failed to list API keys",
        cause: error as Error,
      });
    }
  }

  /**
   * Revoke an API key (not supported by japikey)
   */
  async revokeApiKey(
    _context: AuthenticatedProviderContext,
    _id: string
  ): Promise<void> {
    throw new RuntError(ErrorType.CapabilityNotAvailable, {
      message: "Revoke capability is not supported by local provider",
    });
  }

  /**
   * Delete an API key
   */
  async deleteApiKey(
    context: AuthenticatedProviderContext,
    id: string
  ): Promise<void> {
    await this.ensureInitialized();

    try {
      // First verify the key exists and belongs to the user
      await this.getApiKey(context, id);

      // Delete from japikey database
      const stmt = (this.db as any).db.prepare(
        "DELETE FROM api_keys WHERE id = ?"
      );
      const result = await stmt.bind(id).run();

      if (!result.success || result.changes === 0) {
        throw new RuntError(ErrorType.NotFound, {
          message: "API key not found or already deleted",
          debugPayload: { keyId: id },
        });
      }
    } catch (error) {
      if (error instanceof RuntError) {
        throw error;
      }
      throw new RuntError(ErrorType.Unknown, {
        message: "Failed to delete API key",
        cause: error as Error,
        debugPayload: { keyId: id },
      });
    }
  }

  /**
   * Optional override handler for custom routes
   * Delegates to japikey router for all API key operations
   */
  async overrideHandler(
    _context: ProviderContext
  ): Promise<false | import("@cloudflare/workers-types").Response> {
    // For local provider, we handle all operations through japikey
    // This method is called by the main API handler to check if the provider
    // wants to handle the request directly
    return false; // Let the main handler process the request
  }
}
