import { useContext } from "react";

import { AuthContext } from "./AuthProvider";
export type { UserInfo as AuthUser } from "./AuthProvider";

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useAuthenticatedUser() {
  const { user } = useAuth();
  return user.sub;
}

// Export AI setup utilities for debugging and manual control
export {
  setupEarlyAiClients,
  getAiSetupStatus,
  areAiClientsReady,
  resetAiSetup,
} from "./AiClientSetup.js";
export type { EarlyAiSetupConfig, AiSetupStatus } from "./AiClientSetup.js";
