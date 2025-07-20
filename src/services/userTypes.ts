import { Bot, NotebookPen, Terminal } from "lucide-react";

export interface ClientTypeInfo {
  type: "runtime" | "tui" | "automation" | "user";
  name: string;
  icon: typeof Bot | typeof Terminal | typeof NotebookPen | null;
  color: string;
  backgroundColor: string;
  textColor: string;
}

export const CLIENT_TYPE_CONFIGS: Record<string, ClientTypeInfo> = {
  runtime: {
    type: "runtime",
    name: "Python Runtime",
    icon: Bot,
    color: "#22c55e",
    backgroundColor: "bg-green-100",
    textColor: "text-green-700",
  },
  tui: {
    type: "tui",
    name: "Terminal UI Client",
    icon: Terminal,
    color: "#6366f1",
    backgroundColor: "bg-indigo-100",
    textColor: "text-indigo-700",
  },
  automation: {
    type: "automation",
    name: "Notebook Runner",
    icon: NotebookPen,
    color: "#ec4899",
    backgroundColor: "bg-pink-100",
    textColor: "text-pink-700",
  },
  user: {
    type: "user",
    name: "User",
    icon: null,
    color: "#6b7280",
    backgroundColor: "bg-gray-100",
    textColor: "text-gray-700",
  },
};

/**
 * Determine client type from user ID
 */
export function getClientType(userId: string): ClientTypeInfo["type"] {
  if (userId.includes("runtime") || userId.includes("python")) {
    return "runtime";
  }
  if (userId === "tui-client") {
    return "tui";
  }
  if (userId === "automation-client") {
    return "automation";
  }
  return "user";
}

/**
 * Get complete client type information for a user ID
 */
export function getClientTypeInfo(userId: string): ClientTypeInfo {
  const type = getClientType(userId);
  return CLIENT_TYPE_CONFIGS[type];
}

/**
 * Check if user ID represents a service client (non-human)
 */
export function isServiceClient(userId: string): boolean {
  const type = getClientType(userId);
  return type !== "user";
}

/**
 * Get display name for user based on ID and registry info
 */
export function getClientDisplayName(
  userId: string,
  registryName?: string
): string {
  const clientInfo = getClientTypeInfo(userId);

  if (clientInfo.type !== "user") {
    return clientInfo.name;
  }

  // For users, use registry name or generate fallback
  if (registryName) {
    return registryName;
  }

  // Generate fallback display names for unknown users
  if (/^\d{15,}$/.test(userId)) {
    return `User ${userId.slice(-4)}`;
  } else if (userId.startsWith("session-") || userId.startsWith("client-")) {
    return `Guest ${userId.slice(-4)}`;
  } else if (userId === "local-dev-user") {
    return "Local Dev";
  } else {
    return userId.length > 8 ? `${userId.slice(0, 8)}...` : userId;
  }
}
