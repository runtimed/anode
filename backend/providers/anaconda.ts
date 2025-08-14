import * as jose from "jose";
import { type Env } from "../types.ts";
import { RuntError, ErrorType } from "../types.ts";
import type {
  ApiKeyProvider,
  ApiKeyValidationResult,
  UserInfo,
} from "./types.ts";

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

type ExtensionConfig = {
  apiKeyUrl: string;
  userinfoUrl: string;
};

/**
 * Anaconda API key provider for production/preview environments
 */
export class AnacondaApiKeyProvider implements ApiKeyProvider {
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
  isApiKey(token: string): boolean {
    try {
      const unverified = jose.decodeJwt(token);
      return unverified.ver === "api:1";
    } catch {
      return false;
    }
  }

  /**
   * Validate an API key and return user information
   */
  async validateApiKey(token: string): Promise<ApiKeyValidationResult> {
    try {
      const whoami: AnacondaWhoamiResponse = await fetch(
        this.config.userinfoUrl,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
        .catch(this.createFailureHandler(this.config.userinfoUrl))
        .then(this.handleAnacondaResponse<AnacondaWhoamiResponse>);

      if (whoami.passport.source !== "api_key") {
        return { valid: false, error: "Non-API key token used" };
      }

      // Convert Anaconda scopes to our format
      const scopes = this.convertAnacondaScopes(whoami.passport.scopes);

      // Extract key ID from JWT
      const unverified = jose.decodeJwt(token);
      const keyId = unverified.jti || unverified.sub || "unknown";

      return {
        valid: true,
        userId: whoami.passport.user_id,
        scopes,
        keyId: keyId as string,
        email: whoami.passport.profile.email,
        givenName: whoami.passport.profile.first_name,
        familyName: whoami.passport.profile.last_name,
      };
    } catch (error) {
      if (error instanceof RuntError) {
        // Convert RuntError to validation result
        if (error.type === ErrorType.AuthTokenInvalid) {
          return { valid: false, error: "Invalid or expired API key" };
        }
        if (error.type === ErrorType.AccessDenied) {
          return { valid: false, error: "Access denied" };
        }
        if (error.type === ErrorType.NotFound) {
          return { valid: false, error: "API key not found" };
        }
      }
      console.error("Anaconda API key validation error:", error);
      return { valid: false, error: "Failed to validate API key" };
    }
  }

  /**
   * Get user information for debug purposes
   */
  async getUserInfo(
    result: ApiKeyValidationResult & { valid: true }
  ): Promise<UserInfo> {
    return {
      id: result.userId,
      email: result.email || "unknown@anaconda.com",
      givenName: result.givenName || "Unknown",
      familyName: result.familyName || "User",
      scopes: result.scopes,
    };
  }

  /**
   * Create failure handler for fetch operations
   */
  private createFailureHandler(url: string) {
    return (err: unknown) => {
      throw new RuntError(ErrorType.Unknown, {
        message: `Failed to fetch from ${url}`,
        cause: err as Error,
      });
    };
  }

  /**
   * Handle Anaconda API responses with proper error mapping
   */
  private async handleAnacondaResponse<T>(response: Response): Promise<T> {
    let body: string;
    try {
      body = await response.text();
    } catch (error) {
      throw new RuntError(ErrorType.Unknown, {
        message: `Failed to get the body from ${response.url}`,
        cause: error as Error,
      });
    }

    if (response.status === 400) {
      throw new RuntError(ErrorType.InvalidRequest, {
        message: "Invalid request",
        responsePayload: {
          upstreamCode: response.status,
        },
        debugPayload: {
          upstreamBody: body,
        },
      });
    }
    if (response.status === 401) {
      throw new RuntError(ErrorType.AuthTokenInvalid, {
        responsePayload: {
          upstreamCode: response.status,
        },
        debugPayload: {
          upstreamBody: body,
        },
      });
    }
    if (response.status === 403) {
      throw new RuntError(ErrorType.AccessDenied, {
        responsePayload: {
          upstreamCode: response.status,
        },
        debugPayload: {
          upstreamBody: body,
        },
      });
    }
    if (response.status === 404) {
      throw new RuntError(ErrorType.NotFound, {
        responsePayload: {
          upstreamCode: response.status,
        },
        debugPayload: {
          upstreamBody: body,
        },
      });
    }
    if (!response.ok) {
      throw new RuntError(ErrorType.Unknown, {
        responsePayload: {
          upstreamCode: response.status,
        },
        debugPayload: {
          upstreamBody: body,
        },
      });
    }
    if (response.status === 204) {
      return undefined as T;
    }
    try {
      return JSON.parse(body) as T;
    } catch {
      throw new RuntError(ErrorType.Unknown, {
        message: "Invalid JSON response",
        responsePayload: {
          upstreamCode: response.status,
        },
      });
    }
  }

  /**
   * Convert Anaconda scopes to our internal scope format
   */
  private convertAnacondaScopes(scopes: string[]): string[] {
    const result: string[] = [];
    for (const scope of scopes) {
      if (scope === "cloud:read") {
        result.push("runtime:read");
      }
      if (scope === "cloud:write") {
        result.push("runtime:execute");
      }
    }
    return result;
  }
}
