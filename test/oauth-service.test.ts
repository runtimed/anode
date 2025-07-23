import { describe, it, expect, vi, beforeEach } from "vitest";
import * as client from "openid-client";
import type { Configuration, TokenEndpointResponseHelpers } from "openid-client";
import { OpenIdService, type OpenIdClient } from "../src/services/openid";
import { firstValueFrom } from "rxjs";

describe("openidService", () => {
  let mockClient: OpenIdClient;
  let service: OpenIdService;

  beforeEach(() => {
    mockClient = {
      discovery: vi.fn(),
      randomPKCECodeVerifier: vi.fn().mockReturnValue("mock-verifier"),
      calculatePKCECodeChallenge: vi.fn().mockResolvedValue("mock-challenge"),
      randomState: vi.fn().mockReturnValue("mock-state"),
      buildAuthorizationUrl: vi.fn().mockReturnValue(new URL("https://example.com/auth")),
      refreshTokenGrant: vi.fn().mockResolvedValue({} as TokenEndpointResponseHelpers),
    };
    service = new OpenIdService(mockClient);
  });

  describe("getConfig()", () => {
    it("should reuse config when called twice", async () => {
      const mockConfig = {} as Configuration;

      mockClient.discovery = vi.fn().mockResolvedValue(mockConfig);

      // First call
      const result1 = await firstValueFrom(service.getConfig());
      const result2 = await firstValueFrom(service.getConfig());

      // Verify discovery was only called once
      expect(mockClient.discovery).toHaveBeenCalledTimes(1);

      // Verify both calls return the same cached value
      expect(result1).toEqual(mockConfig);
      expect(result2).toBe(result1);
    });
  });
}); 
