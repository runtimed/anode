import { useState, useCallback, useEffect } from "react";
import { useAuth } from "../auth/index.js";

export enum Scope {
  RuntRead = "runt:read",
  RuntExecute = "runt:execute",
}

export type ApiKey = {
  id: string;
  userId: string;
  name: string;
  scopes: Scope[];
  revoked: boolean;
  expiresAt: string;
};

export type CreateApiKeyRequest = {
  scopes: Scope[];
  expiresAt: string;
  name: string;
  userGenerated: boolean;
};

const AI_API_KEY_NAME = "AI Runtime Key";
const API_BASE = "/api/api-keys";

/**
 * Hook for managing the single AI API key
 *
 * This hook manages a single, well-known API key for AI usage rather than
 * dealing with multiple keys. It will create the key if it doesn't exist.
 */
export function useAiApiKey() {
  const { accessToken, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiApiKey, setAiApiKey] = useState<string | null>(null);
  const [keyMetadata, setKeyMetadata] = useState<ApiKey | null>(null);

  const makeAuthenticatedRequest = useCallback(
    async (url: string, options: RequestInit = {}) => {
      if (!accessToken) {
        throw new Error("No authentication token available");
      }

      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      if (response.status === 204) {
        return null;
      }

      return response.json();
    },
    [accessToken]
  );

  /**
   * Find the existing AI API key by name
   */
  const findExistingAiKey = useCallback(async (): Promise<ApiKey | null> => {
    try {
      const response = await makeAuthenticatedRequest(API_BASE);
      const apiKeys: ApiKey[] = response || [];

      return apiKeys.find(
        (key) =>
          !key.revoked &&
          key.name === AI_API_KEY_NAME &&
          key.scopes.includes(Scope.RuntExecute)
      ) || null;
    } catch (err) {
      console.error("Error finding existing AI key:", err);
      return null;
    }
  }, [makeAuthenticatedRequest]);

  /**
   * Create a new AI API key
   */
  const createAiKey = useCallback(async (): Promise<string> => {
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 year from now

    const request: CreateApiKeyRequest = {
      name: AI_API_KEY_NAME,
      scopes: [Scope.RuntRead, Scope.RuntExecute],
      expiresAt: expiresAt.toISOString(),
      userGenerated: false, // This is system-generated
    };

    const response = await makeAuthenticatedRequest(API_BASE, {
      method: "POST",
      body: JSON.stringify(request),
    });

    return response.api_key;
  }, [makeAuthenticatedRequest]);

  /**
   * Get or create the AI API key
   */
  const ensureAiApiKey = useCallback(async (): Promise<string> => {
    if (!isAuthenticated) {
      throw new Error("Not authenticated");
    }

    setLoading(true);
    setError(null);

    try {
      // First, check if we already have the key
      const existingKey = await findExistingAiKey();

      if (existingKey) {
        setKeyMetadata(existingKey);
        // We can't get the actual key value from the list endpoint
        // So we return the access token for now (same as before)
        // TODO: Backend could provide a way to get the key value
        return accessToken;
      }

      // Create a new key if none exists
      const newKeyValue = await createAiKey();

      // Fetch the metadata for the newly created key
      const newKeyMetadata = await findExistingAiKey();
      setKeyMetadata(newKeyMetadata);

      return newKeyValue;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to get AI API key";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, accessToken, findExistingAiKey, createAiKey]);

  /**
   * Initialize the API key when authenticated
   */
  useEffect(() => {
    if (isAuthenticated && !aiApiKey && !loading) {
      ensureAiApiKey()
        .then(setAiApiKey)
        .catch((err) => {
          console.error("Failed to initialize AI API key:", err);
          // Fallback to access token
          setAiApiKey(accessToken);
        });
    }
  }, [isAuthenticated, aiApiKey, loading, ensureAiApiKey, accessToken]);

  /**
   * Get instructions for setting up the environment variable
   */
  const getEnvInstructions = useCallback(() => {
    if (!keyMetadata) {
      return "Set RUNT_API_KEY environment variable with your AI API key";
    }

    return `To use this key in your local environment:

export RUNT_API_KEY="${aiApiKey || '[your-api-key]'}"

Or add to your .env file:
RUNT_API_KEY=${aiApiKey || '[your-api-key]'}

Key Name: ${keyMetadata.name}
Key ID: ${keyMetadata.id}
Expires: ${new Date(keyMetadata.expiresAt).toLocaleDateString()}`;
  }, [aiApiKey, keyMetadata]);

  return {
    // State
    loading,
    error,
    isReady: !!aiApiKey,

    // The actual API key to use
    apiKey: aiApiKey,

    // Metadata about the key
    keyMetadata,

    // Actions
    refreshKey: ensureAiApiKey,

    // Helper
    getEnvInstructions,
  };
}
