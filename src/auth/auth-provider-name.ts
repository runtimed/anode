export function getAuthProviderName(
  url: URL | null | undefined
): string | null {
  if (!url) {
    return null;
  }

  const hostname = url.hostname;

  // Handle localhost and common localhost IP addresses
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]"
  ) {
    return "";
  }

  // Return the hostname as-is (IP address or domain name)
  return hostname.toLowerCase().replace(/^www\./, "");
}
