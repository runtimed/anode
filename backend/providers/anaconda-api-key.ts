import * as jose from "jose";
import type {
  ApiKeyProvider,
  ProviderContext,
  AuthenticatedProviderContext,
  CreateApiKeyRequest,
  ApiKey,
  ListApiKeysRequest,
  Scope,
} from "../api-key-provider.ts";
import {
  ApiKeyCapabilities,
  RuntError,
  ErrorType,
  type Env,
  createFailureHandler,
  handleProviderResponse,
  scopeMapping,
} from "../api-key-provider.ts";
import { type Passport, type ValidatedUser } from "../auth.ts";

// Anaconda API types
type AnacondaWhoamiResponse = {
  passport: {
    user_id: string;
    profile: {
      email: string;
      first_name: string;
      last_name: string;
      is_confirmed: boolean;
    };
    scopes: string[];
    source: string;
  };
};

type AnacondaCreateApiKeyRequest = {
  scopes: string[];
  user_created: boolean;
  name: string;
  tags: string[];
  expires_at: string;
};

type AnacondaCreateApiKeyResponse = {
  id: string;
  api_key: string;
  expires_at: string;
};

type AnacondaGetApiKeyResponse = {
  id: string;
  name: string;
  user_created: boolean;
  tags: string[];
  scopes: string[];
  created_at: string;
  expires_at: string;
};

type ExtensionConfig = {
  apiKeyUrl: string;
  userinfoUrl: string;
};

/**
 * Anaconda API key provider for production/preview environments
 */
export class AnacondaApiKeyProvider implements ApiKeyProvider {
  public capabilities = new Set([ApiKeyCapabilities.Delete]);

  private config: ExtensionConfig;

  constructor(env: Env) {
    if (!env.EXTENSION_CONFIG) {
      throw new RuntError(ErrorType.ServerMisconfigured, {
        message:
          "EXTENSION_CONFIG environment variable is required for Anaconda provider",
      });
    }

    try {
      this.config = JSON.parse(env.EXTENSION_CONFIG) as ExtensionConfig;
    } catch (error) {
      throw new RuntError(ErrorType.ServerMisconfigured, {
        message: "Invalid EXTENSION_CONFIG JSON",
        cause: error as Error,
      });
    }

    if (!this.config.apiKeyUrl || !this.config.userinfoUrl) {
      throw new RuntError(ErrorType.ServerMisconfigured, {
        message:
          "EXTENSION_CONFIG missing required fields: apiKeyUrl, userinfoUrl",
      });
    }
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
      return unverified.ver === "api:1";
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

    try {
      const whoami: AnacondaWhoamiResponse = await fetch(
        this.config.userinfoUrl,
        {
          headers: {
            Authorization: `Bearer ${context.bearerToken}`,
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
            Accept: "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
          },
        }
      )
        .catch(createFailureHandler(this.config.userinfoUrl))
        .then(handleProviderResponse<AnacondaWhoamiResponse>);

      if (whoami.passport.source !== "api_key") {
        throw new RuntError(ErrorType.AuthTokenInvalid, {
          message: "Non-API key token used",
          debugPayload: {
            upstreamCode: 401,
            upstreamBody: whoami,
          },
        });
      }

      // Convert Anaconda scopes to our internal format
      const scopes: string[] = [];
      for (const scope of whoami.passport.scopes) {
        try {
          scopes.push(scopeMapping.fromExternal(scope, "anaconda"));
        } catch (error) {
          console.warn(`Unknown Anaconda scope: ${scope}`);
        }
      }

      const user: ValidatedUser = {
        id: whoami.passport.user_id,
        email: whoami.passport.profile.email,
        name: `${whoami.passport.profile.first_name} ${whoami.passport.profile.last_name}`.trim(),
        givenName: whoami.passport.profile.first_name,
        familyName: whoami.passport.profile.last_name,
        isAnonymous: false,
      };

      return {
        user,
        jwt: jose.decodeJwt(context.bearerToken),
      };
    } catch (error) {
      if (error instanceof RuntError) {
        throw error;
      }
      throw new RuntError(ErrorType.AuthTokenInvalid, {
        message: "Failed to validate API key with Anaconda",
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
    const requestBody: AnacondaCreateApiKeyRequest = {
      scopes: request.scopes.map((scope) =>
        scopeMapping.toExternal(scope, "anaconda")
      ),
      user_created: request.userGenerated,
      name: request.name ?? "runt-api-key",
      tags: ["runt"],
      expires_at: request.expiresAt,
    };

    try {
      const result: AnacondaCreateApiKeyResponse = await fetch(
        this.config.apiKeyUrl,
        {
          method: "POST",
          body: JSON.stringify(requestBody),
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${context.bearerToken}`,
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
            Accept: "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
          },
        }
      )
        .catch(createFailureHandler(this.config.apiKeyUrl))
        .then(handleProviderResponse<AnacondaCreateApiKeyResponse>);

      return result.api_key;
    } catch (error) {
      if (error instanceof RuntError) {
        throw error;
      }
      throw new RuntError(ErrorType.Unknown, {
        message: "Failed to create API key with Anaconda",
        cause: error as Error,
      });
    }
  }

  /**
   * Get a specific API key by ID
   * Anaconda doesn't have a direct GET endpoint, so we list all keys and filter
   */
  async getApiKey(
    context: AuthenticatedProviderContext,
    id: string
  ): Promise<ApiKey> {
    try {
      const result: AnacondaGetApiKeyResponse[] = await fetch(
        this.config.apiKeyUrl,
        {
          headers: {
            Authorization: `Bearer ${context.bearerToken}`,
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
            Accept: "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
          },
        }
      )
        .catch(createFailureHandler(this.config.apiKeyUrl))
        .then(handleProviderResponse<AnacondaGetApiKeyResponse[]>);

      const match = result.find((r) => r.id === id);
      if (!match) {
        throw new RuntError(ErrorType.NotFound, {
          message: "API key not found",
          debugPayload: { keyId: id },
        });
      }

      return this.anacondaToApiKey(id, context, match);
    } catch (error) {
      if (error instanceof RuntError) {
        throw error;
      }
      throw new RuntError(ErrorType.Unknown, {
        message: "Failed to get API key from Anaconda",
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
    _request: ListApiKeysRequest
  ): Promise<ApiKey[]> {
    try {
      const result: AnacondaGetApiKeyResponse[] = await fetch(
        this.config.apiKeyUrl,
        {
          headers: {
            Authorization: `Bearer ${context.bearerToken}`,
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
            Accept: "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
          },
        }
      )
        .catch(createFailureHandler(this.config.apiKeyUrl))
        .then(handleProviderResponse<AnacondaGetApiKeyResponse[]>);

      return result.map((r) => this.anacondaToApiKey(r.id, context, r));
    } catch (error) {
      if (error instanceof RuntError) {
        throw error;
      }
      throw new RuntError(ErrorType.Unknown, {
        message: "Failed to list API keys from Anaconda",
        cause: error as Error,
      });
    }
  }

  /**
   * Revoke an API key (not supported by Anaconda)
   */
  async revokeApiKey(
    _context: AuthenticatedProviderContext,
    _id: string
  ): Promise<void> {
    throw new RuntError(ErrorType.CapabilityNotAvailable, {
      message: "Revoke capability is not supported by Anaconda provider",
    });
  }

  /**
   * Delete an API key
   */
  async deleteApiKey(
    context: AuthenticatedProviderContext,
    id: string
  ): Promise<void> {
    try {
      await fetch(`${this.config.apiKeyUrl}/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${context.bearerToken}`,
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
        },
      })
        .catch(createFailureHandler(this.config.apiKeyUrl))
        .then(handleProviderResponse<void>);
    } catch (error) {
      if (error instanceof RuntError) {
        throw error;
      }
      throw new RuntError(ErrorType.Unknown, {
        message: "Failed to delete API key from Anaconda",
        cause: error as Error,
        debugPayload: { keyId: id },
      });
    }
  }

  /**
   * Optional override handler for custom routes
   */
  async overrideHandler(
    _context: ProviderContext
  ): Promise<false | import("@cloudflare/workers-types").Response> {
    // Anaconda provider doesn't override any routes
    return false;
  }

  /**
   * Convert Anaconda API key response to our internal format
   */
  private anacondaToApiKey(
    id: string,
    context: AuthenticatedProviderContext,
    anacondaResponse: AnacondaGetApiKeyResponse
  ): ApiKey {
    // Convert Anaconda scopes back to internal format
    const scopes: Scope[] = [];
    for (const scope of anacondaResponse.scopes) {
      try {
        scopes.push(scopeMapping.fromExternal(scope, "anaconda"));
      } catch (error) {
        console.warn(`Unknown Anaconda scope during conversion: ${scope}`);
      }
    }

    return {
      id,
      userId: context.passport.user.id,
      name: anacondaResponse.name,
      scopes,
      expiresAt: anacondaResponse.expires_at,
      userGenerated: anacondaResponse.user_created,
      revoked: false, // Anaconda doesn't have revocation concept
      resources: undefined, // Anaconda doesn't support resources yet
    };
  }
}
