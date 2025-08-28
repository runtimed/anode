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
