/**
 * Detect the operating system
 */
export const getOS = () => {
  if (typeof window === "undefined") return "ssr-no-window";

  const userAgent = window.navigator.userAgent;
  if (userAgent.includes("Mac")) return "mac";
  if (userAgent.includes("Win")) return "win";
  if (userAgent.includes("Linux")) return "linux";
  return "unknown";
};
