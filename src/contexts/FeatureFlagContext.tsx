import React, { createContext, useContext, useEffect, useState } from "react";

// Define available feature flags with strict TypeScript definitions
export interface FeatureFlags {
  "test-flag": boolean;
  "ipynb-export": boolean;
  "user-prompt": boolean;
}

// Default feature flags (all disabled)
const DEFAULT_FLAGS: FeatureFlags = {
  "test-flag": false,
  "ipynb-export": false,
  "user-prompt": false,
} as const;

// Type for feature flag keys
export type FeatureFlagKey = keyof FeatureFlags;

interface FeatureFlagContextType {
  flags: FeatureFlags;
  setFlag: (key: FeatureFlagKey, value: boolean) => void;
}

const FeatureFlagContext = createContext<FeatureFlagContextType | undefined>(
  undefined
);

interface FeatureFlagProviderProps {
  children: React.ReactNode;
}

export function FeatureFlagProvider({ children }: FeatureFlagProviderProps) {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FLAGS);

  // Load feature flags from sessionStorage on mount
  useEffect(() => {
    const loadFlagsFromStorage = () => {
      const storedFlags = { ...DEFAULT_FLAGS };

      // Check each flag in sessionStorage
      Object.keys(DEFAULT_FLAGS).forEach((key) => {
        const flagKey = key as FeatureFlagKey;
        const storedValue = sessionStorage.getItem(`feature-flag-${flagKey}`);
        if (storedValue !== null) {
          storedFlags[flagKey] = storedValue === "true";
        }
      });

      setFlags(storedFlags);
    };

    loadFlagsFromStorage();

    // Listen for storage changes (in case flags are updated in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.startsWith("feature-flag-")) {
        loadFlagsFromStorage();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const setFlag = (key: FeatureFlagKey, value: boolean) => {
    // Update sessionStorage
    sessionStorage.setItem(`feature-flag-${key}`, value.toString());

    // Update local state
    setFlags((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <FeatureFlagContext.Provider value={{ flags, setFlag }}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlag(key: FeatureFlagKey): boolean {
  const context = useContext(FeatureFlagContext);

  if (context === undefined) {
    throw new Error("useFeatureFlag must be used within a FeatureFlagProvider");
  }

  return context.flags[key];
}

// Hook to access the full context (for setting flags)
export function useFeatureFlagContext() {
  const context = useContext(FeatureFlagContext);

  if (context === undefined) {
    throw new Error(
      "useFeatureFlagContext must be used within a FeatureFlagProvider"
    );
  }

  return context;
}
