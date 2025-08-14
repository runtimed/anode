/**
 * Common types for API key providers
 */
export type ApiKeyValidationResult =
  | {
      valid: true;
      userId: string;
      scopes: string[];
      keyId: string;
      email?: string;
      givenName?: string;
      familyName?: string;
    }
  | {
      valid: false;
      error: string;
    };

export type UserInfo = {
  id: string;
  email: string;
  givenName: string;
  familyName: string;
  scopes: string[];
};

/**
 * Interface that all API key providers must implement
 */
export interface ApiKeyProvider {
  /**
   * Check if a token appears to be an API key (vs OIDC token or other auth method)
   */
  isApiKey(token: string): boolean;

  /**
   * Validate an API key and return user information
   */
  validateApiKey(token: string): Promise<ApiKeyValidationResult>;

  /**
   * Get user information for debug/display purposes
   */
  getUserInfo(result: ApiKeyValidationResult & { valid: true }): Promise<UserInfo>;
}
