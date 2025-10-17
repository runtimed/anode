import React, { createContext, useContext } from "react";
import { useSessionStorage } from "react-use";

// Define available feature flags with strict TypeScript definitions
export interface FeatureFlags {
  "test-flag": boolean;
  "ipynb-export": boolean;
  "user-saved-prompt": boolean;
}

// Default feature flags (all disabled)
const DEFAULT_FLAGS: FeatureFlags = {
  "test-flag": false,
  "ipynb-export": false,
  "user-saved-prompt": false,
} as const;

// Type for feature flag keys
export type FeatureFlagKey = keyof FeatureFlags;

interface FeatureFlagContextType {
  flags: FeatureFlags;
  setFlag: (key: FeatureFlagKey, value: boolean) => void;
  allFlagKeys: FeatureFlagKey[];
}

const FeatureFlagContext = createContext<FeatureFlagContextType | undefined>(
  undefined
);

interface FeatureFlagProviderProps {
  children: React.ReactNode;
}

export function FeatureFlagProvider({ children }: FeatureFlagProviderProps) {
  const [flags, setFlags] = useSessionStorage("feature-flags", DEFAULT_FLAGS);

  const setFlag = (key: FeatureFlagKey, value: boolean) => {
    setFlags({ ...flags, [key]: value });
  };

  const allFlagKeys = Object.keys(DEFAULT_FLAGS) as FeatureFlagKey[];

  return (
    <FeatureFlagContext.Provider value={{ flags, setFlag, allFlagKeys }}>
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
