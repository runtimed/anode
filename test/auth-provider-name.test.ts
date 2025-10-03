import { describe, it, expect } from "vitest";
import { getAuthProviderName } from "../src/auth/auth-provider-name";

describe("getAuthProviderName", () => {
  describe("null and undefined inputs", () => {
    it("should return null for null input", () => {
      expect(getAuthProviderName(null)).toBeNull();
    });

    it("should return null for undefined input", () => {
      expect(getAuthProviderName(undefined)).toBeNull();
    });
  });

  describe("localhost and common localhost IP addresses", () => {
    it("should return '' for localhost", () => {
      expect(getAuthProviderName(new URL("http://localhost:3000/login"))).toBe(
        ""
      );
    });

    it("should return '' for common localhost IP addresses", () => {
      expect(getAuthProviderName(new URL("http://127.0.0.1:3000/login"))).toBe(
        ""
      );
      expect(getAuthProviderName(new URL("https://[::1]:8080/auth"))).toBe("");
    });

    it("should return IP address for other IP addresses", () => {
      expect(
        getAuthProviderName(new URL("https://192.168.1.1:8080/auth"))
      ).toBe("192.168.1.1");
      expect(getAuthProviderName(new URL("http://10.0.0.1:5000/oauth"))).toBe(
        "10.0.0.1"
      );
      expect(getAuthProviderName(new URL("http://0.0.0.0:3000"))).toBe(
        "0.0.0.0"
      );
      expect(getAuthProviderName(new URL("https://255.255.255.255:8080"))).toBe(
        "255.255.255.255"
      );
    });
  });

  describe("simple domains (two parts)", () => {
    it("should return hostname as-is for simple domains", () => {
      expect(getAuthProviderName(new URL("https://google.com/oauth"))).toBe(
        "google.com"
      );
      expect(getAuthProviderName(new URL("https://github.com/login"))).toBe(
        "github.com"
      );
      expect(getAuthProviderName(new URL("https://facebook.com/auth"))).toBe(
        "facebook.com"
      );
      expect(getAuthProviderName(new URL("https://apple.com/signin"))).toBe(
        "apple.com"
      );
    });

    it("should handle domains with different TLDs", () => {
      expect(getAuthProviderName(new URL("https://example.org/oauth"))).toBe(
        "example.org"
      );
      expect(getAuthProviderName(new URL("https://test.net/auth"))).toBe(
        "test.net"
      );
      expect(getAuthProviderName(new URL("https://demo.io/login"))).toBe(
        "demo.io"
      );
    });
  });

  describe("complex domains (three or more parts)", () => {
    it("should handle multiple subdomains", () => {
      expect(
        getAuthProviderName(new URL("https://accounts.google.com/oauth"))
      ).toBe("accounts.google.com");
      expect(
        getAuthProviderName(new URL("https://api.v2.auth0.com/oauth"))
      ).toBe("api.v2.auth0.com");
      expect(
        getAuthProviderName(
          new URL("https://subdomain.example.auth0.com/oauth")
        )
      ).toBe("subdomain.example.auth0.com");
      expect(
        getAuthProviderName(new URL("https://dev.staging.example.com/auth"))
      ).toBe("dev.staging.example.com");
    });

    it("should handle domains with www prefix", () => {
      expect(getAuthProviderName(new URL("https://www.google.com/oauth"))).toBe(
        "google.com"
      );
      expect(getAuthProviderName(new URL("https://www.github.com/login"))).toBe(
        "github.com"
      );
      expect(
        getAuthProviderName(new URL("https://www.facebook.com/auth"))
      ).toBe("facebook.com");
    });
  });

  describe("edge cases", () => {
    it("should return hostname for single-part hostnames", () => {
      // Note: URL constructor will throw for invalid URLs, so we test with valid but unusual cases
      // Single part domains like "localhost" are handled by the localhost check above
      expect(getAuthProviderName(new URL("https://a/oauth"))).toBe("a");
    });

    it("should handle domains with numbers", () => {
      expect(getAuthProviderName(new URL("https://auth123.com/oauth"))).toBe(
        "auth123.com"
      );
      expect(getAuthProviderName(new URL("https://123auth.com/oauth"))).toBe(
        "123auth.com"
      );
      expect(
        getAuthProviderName(new URL("https://test123.example.com/oauth"))
      ).toBe("test123.example.com");
    });

    it("should handle domains with hyphens", () => {
      expect(getAuthProviderName(new URL("https://my-company.com/oauth"))).toBe(
        "my-company.com"
      );
      expect(
        getAuthProviderName(new URL("https://auth-service.example.com/oauth"))
      ).toBe("auth-service.example.com");
    });

    it("should handle very long domain names", () => {
      const longDomain = "a".repeat(50) + ".com";
      expect(getAuthProviderName(new URL(`https://${longDomain}/oauth`))).toBe(
        longDomain
      );
    });
  });

  describe("international domains", () => {
    it("should return hostname as-is for country code TLDs", () => {
      expect(getAuthProviderName(new URL("https://example.co.uk/oauth"))).toBe(
        "example.co.uk"
      );
      expect(getAuthProviderName(new URL("https://test.com.au/auth"))).toBe(
        "test.com.au"
      );
      expect(getAuthProviderName(new URL("https://demo.org.uk/login"))).toBe(
        "demo.org.uk"
      );
    });

    it("should handle complex international domains", () => {
      expect(
        getAuthProviderName(new URL("https://subdomain.example.co.uk/oauth"))
      ).toBe("subdomain.example.co.uk");
      expect(getAuthProviderName(new URL("https://api.test.com.au/auth"))).toBe(
        "api.test.com.au"
      );
    });
  });

  describe("URL variations", () => {
    it("should handle different protocols", () => {
      expect(getAuthProviderName(new URL("http://example.com/oauth"))).toBe(
        "example.com"
      );
      expect(getAuthProviderName(new URL("https://example.com/oauth"))).toBe(
        "example.com"
      );
    });

    it("should handle URLs with paths and query parameters", () => {
      expect(
        getAuthProviderName(
          new URL("https://accounts.google.com/oauth/authorize?client_id=123")
        )
      ).toBe("accounts.google.com");
      expect(
        getAuthProviderName(
          new URL("https://github.com/login/oauth/authorize?scope=user")
        )
      ).toBe("github.com");
    });

    it("should handle URLs with fragments", () => {
      expect(
        getAuthProviderName(
          new URL("https://auth0.com/oauth#access_token=abc123")
        )
      ).toBe("auth0.com");
    });

    it("should handle URLs with ports", () => {
      expect(
        getAuthProviderName(new URL("https://example.com:8080/oauth"))
      ).toBe("example.com");
      expect(getAuthProviderName(new URL("http://test.com:3000/auth"))).toBe(
        "test.com"
      );
    });
  });

  describe("real-world OAuth providers", () => {
    it("should handle common OAuth providers", () => {
      expect(
        getAuthProviderName(new URL("https://accounts.google.com/oauth"))
      ).toBe("accounts.google.com");
      expect(
        getAuthProviderName(new URL("https://github.com/login/oauth"))
      ).toBe("github.com");
      expect(
        getAuthProviderName(new URL("https://login.microsoftonline.com/oauth"))
      ).toBe("login.microsoftonline.com");
      expect(
        getAuthProviderName(new URL("https://appleid.apple.com/oauth"))
      ).toBe("appleid.apple.com");
      expect(
        getAuthProviderName(new URL("https://api.twitter.com/oauth"))
      ).toBe("api.twitter.com");
    });

    it("should handle Auth0 variations", () => {
      expect(
        getAuthProviderName(new URL("https://mycompany.auth0.com/oauth"))
      ).toBe("mycompany.auth0.com");
      expect(
        getAuthProviderName(new URL("https://dev-123456.us.auth0.com/oauth"))
      ).toBe("dev-123456.us.auth0.com");
      expect(getAuthProviderName(new URL("https://auth0.com/oauth"))).toBe(
        "auth0.com"
      );
    });

    it("should handle enterprise domains", () => {
      expect(
        getAuthProviderName(new URL("https://login.company.com/oauth"))
      ).toBe("login.company.com");
      expect(
        getAuthProviderName(new URL("https://auth.enterprise.com/login"))
      ).toBe("auth.enterprise.com");
    });
  });

  describe("case sensitivity", () => {
    it("should return hostname as-is without capitalization", () => {
      expect(getAuthProviderName(new URL("https://GOOGLE.COM/oauth"))).toBe(
        "google.com"
      );
      expect(getAuthProviderName(new URL("https://GITHUB.COM/login"))).toBe(
        "github.com"
      );
      expect(getAuthProviderName(new URL("https://FACEBOOK.COM/auth"))).toBe(
        "facebook.com"
      );
    });

    it("should handle mixed case domains", () => {
      expect(getAuthProviderName(new URL("https://GoOgLe.CoM/oauth"))).toBe(
        "google.com"
      );
      expect(getAuthProviderName(new URL("https://GiThUb.CoM/login"))).toBe(
        "github.com"
      );
    });
  });
});
