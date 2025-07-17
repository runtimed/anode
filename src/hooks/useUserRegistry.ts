import { useCallback, useEffect, useState } from "react";
import { useCurrentUser } from "./useCurrentUser.js";
import { generateInitials } from "../util/avatar.js";

export interface UserInfo {
  id: string;
  name: string;
  email?: string;
  picture?: string;
  isAnonymous: boolean;
  lastSeen: number;
}

// Local storage key for user registry
const USER_REGISTRY_KEY = "anode_user_registry";

// In-memory cache for this session
let userRegistryCache: Map<string, UserInfo> = new Map();
let isInitialized = false;

// Load registry from localStorage
const loadUserRegistry = (): Map<string, UserInfo> => {
  if (isInitialized) {
    return userRegistryCache;
  }

  try {
    const stored = localStorage.getItem(USER_REGISTRY_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      userRegistryCache = new Map(Object.entries(parsed));
    }
  } catch (error) {
    console.warn("Failed to load user registry from localStorage:", error);
    userRegistryCache = new Map();
  }

  isInitialized = true;
  return userRegistryCache;
};

// Save registry to localStorage
const saveUserRegistry = (registry: Map<string, UserInfo>): void => {
  try {
    const serializable = Object.fromEntries(registry);
    localStorage.setItem(USER_REGISTRY_KEY, JSON.stringify(serializable));
  } catch (error) {
    console.warn("Failed to save user registry to localStorage:", error);
  }
};

// Clean up old entries (older than 7 days)
const cleanupOldEntries = (registry: Map<string, UserInfo>): void => {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let hasChanges = false;

  for (const [userId, userInfo] of registry.entries()) {
    if (userInfo.lastSeen < sevenDaysAgo) {
      registry.delete(userId);
      hasChanges = true;
    }
  }

  if (hasChanges) {
    saveUserRegistry(registry);
  }
};

export const useUserRegistry = () => {
  const currentUser = useCurrentUser();
  const [registry, setRegistry] = useState<Map<string, UserInfo>>(() =>
    loadUserRegistry()
  );

  // Update current user info in registry
  useEffect(() => {
    setRegistry((prevRegistry) => {
      const updatedRegistry = new Map(prevRegistry);
      const now = Date.now();

      // Always update current user info
      updatedRegistry.set(currentUser.id, {
        ...currentUser,
        lastSeen: now,
      });

      // Clean up old entries periodically
      cleanupOldEntries(updatedRegistry);

      saveUserRegistry(updatedRegistry);
      return updatedRegistry;
    });
  }, [currentUser]);

  // Get user info by ID with fallback display logic
  const getUserInfo = useCallback(
    (userId: string): UserInfo => {
      const cached = registry.get(userId);
      if (cached) {
        return cached;
      }

      // Generate fallback display info for unknown users
      let name: string;
      let isAnonymous = true;

      if (/^\d{15,}$/.test(userId)) {
        // Google OAuth user ID (long number)
        name = `User ${userId.slice(-4)}`;
        isAnonymous = false;
      } else if (
        userId.startsWith("session-") ||
        userId.startsWith("client-")
      ) {
        // Session/client ID
        name = `Guest ${userId.slice(-4)}`;
      } else if (userId === "runtime-agent") {
        name = "Runtime Agent";
        isAnonymous = false;
      } else if (userId === "local-dev-user") {
        name = "Local Dev";
      } else {
        // Other unknown IDs
        name = userId.length > 8 ? `${userId.slice(0, 8)}...` : userId;
      }

      const fallbackInfo: UserInfo = {
        id: userId,
        name,
        isAnonymous,
        lastSeen: Date.now(),
      };

      // Don't cache fallback info to avoid polluting registry
      return fallbackInfo;
    },
    [registry]
  );

  // Get display name for a user ID
  const getDisplayName = useCallback(
    (userId: string): string => {
      return getUserInfo(userId).name;
    },
    [getUserInfo]
  );

  // Get user initials for avatar
  const getUserInitials = useCallback(
    (userId: string): string => {
      const userInfo = getUserInfo(userId);
      if (userInfo.isAnonymous) {
        return generateInitials(userId);
      }
      return generateInitials(userInfo.name);
    },
    [getUserInfo]
  );

  // Register a new user (when we learn about them from presence or events)
  const registerUser = useCallback(
    (userInfo: Partial<UserInfo> & { id: string }): void => {
      const updatedRegistry = new Map(registry);
      const existing = updatedRegistry.get(userInfo.id);

      const newUserInfo: UserInfo = {
        name: userInfo.name || getDisplayName(userInfo.id),
        email: userInfo.email,
        picture: userInfo.picture,
        isAnonymous: userInfo.isAnonymous ?? true,
        lastSeen: Date.now(),
        ...existing, // Keep existing data
        ...userInfo, // Override with new data
        id: userInfo.id, // Ensure ID is always set
      };

      updatedRegistry.set(userInfo.id, newUserInfo);
      setRegistry(updatedRegistry);
      saveUserRegistry(updatedRegistry);
    },
    [registry, getDisplayName]
  );

  return {
    getUserInfo,
    getDisplayName,
    getUserInitials,
    registerUser,
    registry: Array.from(registry.values()),
  };
};
