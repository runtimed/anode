import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { firstValueFrom } from "rxjs";
import { OpenIdService } from "../src/services/openid";

describe("OpenIdService", () => {
  let mockClient: any;
  let service: OpenIdService;

  const createMockClaims = (overrides = {}) => ({
    sub: "test-user-id",
    email: "test@example.com",
    email_verified: true,
    family_name: "Test",
    given_name: "User",
    name: "Test User",
    picture: "https://example.com/avatar.jpg",
    ...overrides,
  });

  const createMockTokens = (overrides = {}) => ({
    accessToken: "valid-access-token",
    refreshToken: "valid-refresh-token",
    expiresAt: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    claims: createMockClaims(),
    ...overrides,
  });

  const createExpiringTokens = (secondsFromNow = 30, claimsOverrides = {}) => ({
    accessToken: "expiring-access-token",
    refreshToken: "valid-refresh-token",
    expiresAt: Math.floor(Date.now() / 1000) + secondsFromNow,
    claims: createMockClaims(claimsOverrides),
  });

  const createExpiredTokens = (secondsAgo = 60, claimsOverrides = {}) => ({
    accessToken: "expired-access-token",
    refreshToken: "valid-refresh-token",
    expiresAt: Math.floor(Date.now() / 1000) - secondsAgo,
    claims: createMockClaims(claimsOverrides),
  });

  beforeEach(() => {
    localStorage.clear();

    mockClient = {
      discovery: vi.fn().mockResolvedValue({
        authorization_endpoint: "https://auth.example.com/authorize",
      } as any),
      randomPKCECodeVerifier: vi.fn().mockReturnValue("test-verifier"),
      calculatePKCECodeChallenge: vi.fn().mockResolvedValue("test-challenge"),
      randomState: vi.fn().mockReturnValue("test-state"),
      buildAuthorizationUrl: vi
        .fn()
        .mockReturnValue(new URL("https://auth.example.com/authorize")),
      refreshTokenGrant: vi.fn(),
    };

    service = new OpenIdService();
    service.setClient(mockClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getRedirectUrls", () => {
    it("should emit authorization URLs when generated", async () => {
      const mockLoginUrl = new URL(
        "https://auth.example.com/authorize?prompt=login"
      );
      const mockRegisterUrl = new URL(
        "https://auth.example.com/authorize?prompt=registration"
      );

      mockClient.buildAuthorizationUrl
        .mockReturnValueOnce(mockLoginUrl)
        .mockReturnValueOnce(mockRegisterUrl);

      const redirectUrls$ = service.getRedirectUrls();
      const state = await firstValueFrom(redirectUrls$);

      expect(state).toEqual({
        loginUrl: mockLoginUrl,
        registrationUrl: mockRegisterUrl,
      });
    });

    it("should throw error when discovery fails", async () => {
      mockClient.discovery.mockRejectedValue(new Error("Discovery failed"));

      const redirectUrls$ = service.getRedirectUrls();
      let error: Error | null = null;

      redirectUrls$.subscribe({
        next: () => {},
        error: (err) => (error = err),
      });

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(error).toBeDefined();
      expect(error!.message).toBe("Discovery failed");
    });

    it("should cache successful results and share between subscriptions", async () => {
      const mockLoginUrl = new URL(
        "https://auth.example.com/authorize?prompt=login"
      );
      const mockRegisterUrl = new URL(
        "https://auth.example.com/authorize?prompt=registration"
      );

      mockClient.buildAuthorizationUrl
        .mockReturnValueOnce(mockLoginUrl)
        .mockReturnValueOnce(mockRegisterUrl)
        .mockReturnValueOnce(mockLoginUrl)
        .mockReturnValueOnce(mockRegisterUrl);

      // First subscription
      const firstState = await firstValueFrom(service.getRedirectUrls());

      // Second subscription should use cached results
      const secondState = await firstValueFrom(service.getRedirectUrls());

      expect(firstState).toEqual({
        loginUrl: mockLoginUrl,
        registrationUrl: mockRegisterUrl,
      });
      expect(secondState).toEqual(firstState);

      // Discovery should only be called once
      expect(mockClient.discovery).toHaveBeenCalledTimes(1);
    });
  });

  describe("getUser", () => {
    it("should return null when no tokens are stored", async () => {
      const user$ = service.getUser();
      const user = await firstValueFrom(user$);
      expect(user).toBeNull();
    });

    it("should return user when tokens are valid and not expired", async () => {
      const validTokens = createMockTokens();

      localStorage.setItem("openid_tokens", JSON.stringify(validTokens));

      const user$ = service.getUser();
      const user = await firstValueFrom(user$);

      expect(user).toEqual({
        accessToken: "valid-access-token",
        claims: validTokens.claims,
      });
    });

    it("should trigger refresh when token is within 1 minute of expiration", async () => {
      const expiringTokens = createExpiringTokens(30, {
        sub: "old-user-id",
        email: "old@example.com",
        family_name: "Old",
        name: "Old User",
        picture: "https://example.com/old-avatar.jpg",
      });

      localStorage.setItem("openid_tokens", JSON.stringify(expiringTokens));

      const newClaims = createMockClaims({
        sub: "new-user-id",
        email: "new@example.com",
        family_name: "New",
        name: "New User",
        picture: "https://example.com/new-avatar.jpg",
      });

      const refreshedTokens = {
        access_token: "new-access-token",
        refresh_token: "new-refresh-token",
        expires_in: 3600,
        claims: () => newClaims,
      };

      mockClient.refreshTokenGrant.mockResolvedValue(refreshedTokens);

      const user$ = service.getUser();
      const user = await firstValueFrom(user$);

      expect(user).toEqual({
        accessToken: "new-access-token",
        claims: newClaims,
      });
      expect(mockClient.refreshTokenGrant).toHaveBeenCalledWith(
        expect.any(Object),
        "valid-refresh-token",
        { scopes: "openid email profile offline_access" }
      );
    });

    it("should trigger refresh when token is already expired", async () => {
      const expiredTokens = createExpiredTokens(60, {
        sub: "old-user-id",
        email: "old@example.com",
        family_name: "Old",
        name: "Old User",
        picture: "https://example.com/old-avatar.jpg",
      });

      localStorage.setItem("openid_tokens", JSON.stringify(expiredTokens));

      const newClaims = createMockClaims({
        sub: "new-user-id",
        email: "new@example.com",
        family_name: "New",
        name: "New User",
        picture: "https://example.com/new-avatar.jpg",
      });

      const refreshedTokens = {
        access_token: "new-access-token",
        refresh_token: "new-refresh-token",
        expires_in: 3600,
        claims: () => newClaims,
      };

      mockClient.refreshTokenGrant.mockResolvedValue(refreshedTokens);

      const user$ = service.getUser();
      const user = await firstValueFrom(user$);

      expect(user).toEqual({
        accessToken: "new-access-token",
        claims: newClaims,
      });
      expect(mockClient.refreshTokenGrant).toHaveBeenCalled();
    });

    it("should handle refresh failure by clearing tokens", async () => {
      const expiringTokens = createExpiringTokens();

      localStorage.setItem("openid_tokens", JSON.stringify(expiringTokens));

      mockClient.refreshTokenGrant.mockRejectedValue(
        new Error("Refresh failed")
      );

      const user$ = service.getUser();
      const user = await firstValueFrom(user$);

      expect(user).toBeNull();
      expect(localStorage.getItem("openid_tokens")).toBeNull();
    });

    it("should not trigger multiple concurrent refreshes", async () => {
      const expiringTokens = createExpiringTokens();

      localStorage.setItem("openid_tokens", JSON.stringify(expiringTokens));

      const newClaims = createMockClaims({
        sub: "new-user-id",
        email: "new@example.com",
        family_name: "New",
        name: "New User",
        picture: "https://example.com/new-avatar.jpg",
      });

      const refreshedTokens = {
        access_token: "new-access-token",
        refresh_token: "new-refresh-token",
        expires_in: 3600,
        claims: () => newClaims,
      };

      mockClient.refreshTokenGrant.mockResolvedValue(refreshedTokens);

      // Make multiple concurrent calls
      const user1$ = service.getUser();
      const user2$ = service.getUser();
      const user3$ = service.getUser();

      const [user1, user2, user3] = await Promise.all([
        firstValueFrom(user1$),
        firstValueFrom(user2$),
        firstValueFrom(user3$),
      ]);

      const expectedUser = {
        accessToken: "new-access-token",
        claims: newClaims,
      };

      expect(user1).toEqual(expectedUser);
      expect(user2).toEqual(expectedUser);
      expect(user3).toEqual(expectedUser);

      // Should only call refresh once
      expect(mockClient.refreshTokenGrant).toHaveBeenCalledTimes(1);
    });

    it("should return null when user logs out (reset is called)", async () => {
      const tokens = createMockTokens();

      localStorage.setItem("openid_tokens", JSON.stringify(tokens));

      // First, verify user is available
      const initialUser$ = service.getUser();
      const initialUser = await firstValueFrom(initialUser$);
      expect(initialUser).toEqual({
        accessToken: "valid-access-token",
        claims: tokens.claims,
      });

      // Reset (simulate logout)
      service.reset();

      // Check that user is now null
      const userAfterReset$ = service.getUser();
      const userAfterReset = await firstValueFrom(userAfterReset$);
      expect(userAfterReset).toBeNull();
    });
  });

  describe("reset", () => {
    it("should clear cached state and trigger fresh attempt", async () => {
      const mockLoginUrl = new URL(
        "https://auth.example.com/authorize?prompt=login"
      );
      const mockRegisterUrl = new URL(
        "https://auth.example.com/authorize?prompt=registration"
      );

      mockClient.buildAuthorizationUrl
        .mockReturnValueOnce(mockLoginUrl)
        .mockReturnValueOnce(mockRegisterUrl)
        .mockReturnValueOnce(mockLoginUrl)
        .mockReturnValueOnce(mockRegisterUrl);

      // First call
      await firstValueFrom(service.getRedirectUrls());

      // Reset
      service.reset();

      // Second call should trigger fresh discovery
      await firstValueFrom(service.getRedirectUrls());

      // Discovery should be called twice (once for each call)
      expect(mockClient.discovery).toHaveBeenCalledTimes(2);
    });

    it("should recover from error after reset() is called", async () => {
      mockClient.discovery
        .mockRejectedValueOnce(new Error("Discovery failed"))
        .mockResolvedValueOnce({
          authorization_endpoint: "https://auth.example.com/authorize",
        } as any);

      mockClient.buildAuthorizationUrl.mockReturnValue(
        new URL("https://auth.example.com/authorize")
      );

      const redirectUrls$ = service.getRedirectUrls();
      let error: Error | null = null;

      redirectUrls$.subscribe({
        next: () => {},
        error: (err) => (error = err),
      });

      // Wait for first error
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(error).toBeDefined();

      // Reset and try again
      service.reset();
      error = null;

      const newRedirectUrls$ = service.getRedirectUrls();
      newRedirectUrls$.subscribe({
        next: () => {},
        error: (err) => (error = err),
      });

      // Wait for second attempt
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(error).toBeNull();
    });
  });

  describe("handleRedirect", () => {
    it("should convert authorization code to tokens and share result between subscribers", async () => {
      // Mock the authorization code grant
      const mockTokenResponse = {
        access_token: "test-access-token",
        refresh_token: "test-refresh-token",
        expires_in: 3600,
        claims: () => createMockClaims(),
      };

      mockClient.authorizationCodeGrant = vi
        .fn()
        .mockResolvedValue(mockTokenResponse);

      // Set up localStorage with request state
      const requestState = {
        verifier: "test-verifier",
        challenge: "test-challenge",
        state: "test-state",
      };
      localStorage.setItem(
        "openid_request_state",
        JSON.stringify(requestState)
      );

      // First subscription
      const firstTokens$ = service.handleRedirect();
      const firstTokens = await firstValueFrom(firstTokens$);

      // Verify the tokens
      expect(firstTokens).toEqual({
        accessToken: "test-access-token",
        refreshToken: "test-refresh-token",
        expiresAt: expect.any(Number),
        claims: createMockClaims(),
      });

      // Verify tokens were stored in localStorage
      const storedTokens = JSON.parse(
        localStorage.getItem("openid_tokens") || "null"
      );
      expect(storedTokens).toEqual({
        accessToken: "test-access-token",
        refreshToken: "test-refresh-token",
        expiresAt: expect.any(Number),
        claims: createMockClaims(),
      });

      // Second subscription should get the same result
      const secondTokens$ = service.handleRedirect();
      const secondTokens = await firstValueFrom(secondTokens$);

      expect(secondTokens).toEqual(firstTokens);

      // authorizationCodeGrant should only be called once
      expect(mockClient.authorizationCodeGrant).toHaveBeenCalledTimes(1);
    });

    it("should throw error when localStorage request state is missing", async () => {
      const tokens$ = service.handleRedirect();
      const promise = firstValueFrom(tokens$);
      expect(promise).rejects.toThrow(
        "Missing pre-login secrets. Is localstorage enabled?"
      );

      // Even if localstorage is added, the observable still returns the existing one
      const requestState = {
        verifier: "test-verifier",
        challenge: "test-challenge",
        state: "test-state",
      };
      localStorage.setItem(
        "openid_request_state",
        JSON.stringify(requestState)
      );
      const tokens2$ = service.handleRedirect();
      const promise2 = firstValueFrom(tokens2$);
      expect(promise2).rejects.toThrow(
        "Missing pre-login secrets. Is localstorage enabled?"
      );
    });
  });
});
