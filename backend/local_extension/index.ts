import {
  ApiKeyCapabilities,
  ApiKeyProvider,
  type ApiKey,
} from "@runtimed/extensions/providers/api_key";
import * as jose from "jose";
import {
  RuntError,
  ErrorType,
  Passport,
  AuthType,
  Scope,
  type ProviderContext,
} from "@runtimed/extensions";

// Simple local extension that delegates to japikey for actual functionality
// This is primarily used for the debug auth endpoint
const provider: ApiKeyProvider = {
  capabilities: new Set([ApiKeyCapabilities.Delete]),

  isApiKey: (context: ProviderContext): boolean => {
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
  },

  validateApiKey: async (context: ProviderContext): Promise<Passport> => {
    if (!context.bearerToken) {
      throw new RuntError(ErrorType.MissingAuthToken);
    }

    try {
      const unverified = jose.decodeJwt(context.bearerToken);

      if (!unverified.sub || !unverified.iss || unverified.aud !== "api-keys") {
        throw new RuntError(ErrorType.AuthTokenInvalid, {
          message: "Invalid API key format",
        });
      }

      // Extract key ID from subject
      const keyId = unverified.sub as string;

      // Get JWKS URL from issuer
      const jwksUrl = `${unverified.iss}/${keyId}/.well-known/jwks.json`;

      // Fetch JWKS and verify signature
      const JWKS = jose.createRemoteJWKSet(new URL(jwksUrl));
      const { payload } = await jose.jwtVerify(context.bearerToken, JWKS, {
        issuer: unverified.iss as string,
        audience: "api-keys",
      });

      // Convert scopes from payload
      const scopes: Scope[] = [];
      if (payload.scopes && Array.isArray(payload.scopes)) {
        for (const scope of payload.scopes) {
          if (scope === "runtime:read") {
            scopes.push(Scope.RuntRead);
          }
          if (scope === "runtime:execute") {
            scopes.push(Scope.RuntExecute);
          }
        }
      }

      // For local development, create a minimal passport
      // In production, this would be handled by the Anaconda extension
      return {
        type: AuthType.ApiKey,
        user: {
          id: `local-${keyId}`, // Synthetic user ID for local development
          email: `local-${keyId}@dev.local`,
          givenName: "Local",
          familyName: "User",
        },
        claims: payload,
        scopes,
        resources: (payload.resources as any) || null,
      };
    } catch (error) {
      if (error instanceof jose.errors.JWTExpired) {
        throw new RuntError(ErrorType.AuthTokenExpired, { cause: error });
      }
      if (error instanceof RuntError) {
        throw error;
      }
      throw new RuntError(ErrorType.AuthTokenInvalid, {
        cause: error as Error,
        message: "Failed to validate API key",
      });
    }
  },

  // These operations should be handled by japikey router directly
  createApiKey: async (): Promise<string> => {
    throw new RuntError(ErrorType.CapabilityNotAvailable, {
      message:
        "API key creation should be handled by japikey router at /api/api-keys",
    });
  },

  getApiKey: async (): Promise<ApiKey> => {
    throw new RuntError(ErrorType.CapabilityNotAvailable, {
      message:
        "API key retrieval should be handled by japikey router at /api/api-keys",
    });
  },

  listApiKeys: async (): Promise<ApiKey[]> => {
    throw new RuntError(ErrorType.CapabilityNotAvailable, {
      message:
        "API key listing should be handled by japikey router at /api/api-keys",
    });
  },

  revokeApiKey: async (): Promise<void> => {
    throw new RuntError(ErrorType.CapabilityNotAvailable, {
      message: "API key revocation is not supported in local development",
    });
  },

  deleteApiKey: async (): Promise<void> => {
    throw new RuntError(ErrorType.CapabilityNotAvailable, {
      message:
        "API key deletion should be handled by japikey router at /api/api-keys",
    });
  },
};

export default { apiKey: provider };
