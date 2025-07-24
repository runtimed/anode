import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { OpenIdService, OpenIdClient, RedirectUrls, User } from '../src/services/openid';

// Mock environment variables
vi.mock('import.meta.env', () => ({
  VITE_AUTH_URI: 'https://auth.example.com',
  VITE_AUTH_CLIENT_ID: 'test-client-id',
  VITE_AUTH_REDIRECT_URI: 'http://localhost:3000/callback'
}));

describe('OpenIdService', () => {
  let mockClient: any;
  let service: OpenIdService;

  beforeEach(() => {
    localStorage.clear();

    mockClient = {
      discovery: vi.fn(),
      randomPKCECodeVerifier: vi.fn(),
      calculatePKCECodeChallenge: vi.fn(),
      randomState: vi.fn(),
      buildAuthorizationUrl: vi.fn(),
      refreshTokenGrant: vi.fn()
    };

    service = new OpenIdService();
    service.setClient(mockClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getRedirectUrls', () => {
    it('should emit authorization URLs when generated', async () => {
      const mockLoginUrl = new URL('https://auth.example.com/authorize?prompt=login');
      const mockRegisterUrl = new URL('https://auth.example.com/authorize?prompt=registration');

      mockClient.discovery.mockResolvedValue({
        authorization_endpoint: 'https://auth.example.com/authorize'
      } as any);
      mockClient.randomPKCECodeVerifier.mockReturnValue('test-verifier');
      mockClient.calculatePKCECodeChallenge.mockResolvedValue('test-challenge');
      mockClient.randomState.mockReturnValue('test-state');
      mockClient.buildAuthorizationUrl
        .mockReturnValueOnce(mockLoginUrl)
        .mockReturnValueOnce(mockRegisterUrl);

      const redirectUrls$ = service.getRedirectUrls();
      const state = await firstValueFrom(redirectUrls$);

      expect(state).toEqual({
        loginUrl: mockLoginUrl,
        registrationUrl: mockRegisterUrl
      });
    });

    it('should throw error when discovery fails', async () => {
      mockClient.discovery.mockRejectedValue(new Error('Discovery failed'));

      const redirectUrls$ = service.getRedirectUrls();
      let error: Error | null = null;

      redirectUrls$.subscribe({
        next: () => { },
        error: err => error = err
      });

      // Wait for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(error).toBeDefined();
      expect(error!.message).toBe('Discovery failed');
    });

    it('should cache successful results and share between subscriptions', async () => {
      const mockLoginUrl = new URL('https://auth.example.com/authorize?prompt=login');
      const mockRegisterUrl = new URL('https://auth.example.com/authorize?prompt=registration');

      mockClient.discovery.mockResolvedValue({
        authorization_endpoint: 'https://auth.example.com/authorize'
      } as any);
      mockClient.randomPKCECodeVerifier.mockReturnValue('test-verifier');
      mockClient.calculatePKCECodeChallenge.mockResolvedValue('test-challenge');
      mockClient.randomState.mockReturnValue('test-state');
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
        registrationUrl: mockRegisterUrl
      });
      expect(secondState).toEqual(firstState);

      // Discovery should only be called once
      expect(mockClient.discovery).toHaveBeenCalledTimes(1);
    });
  });

  describe('getUser', () => {
    it('should return null when no tokens are stored', async () => {
      const user$ = service.getUser();
      const user = await firstValueFrom(user$);
      expect(user).toBeNull();
    });

    it('should return user when tokens are valid and not expired', async () => {
      const now = Math.floor(Date.now() / 1000);
      const mockClaims = {
        sub: 'test-user-id',
        email: 'test@example.com',
        email_verified: true,
        family_name: 'Test',
        given_name: 'User',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg'
      };

      const validTokens = {
        accessToken: 'valid-access-token',
        refreshToken: 'valid-refresh-token',
        expiresAt: now + 3600, // 1 hour from now
        claims: mockClaims
      };

      localStorage.setItem('openid_tokens', JSON.stringify(validTokens));

      mockClient.discovery.mockResolvedValue({
        authorization_endpoint: 'https://auth.example.com/authorize'
      } as any);

      const user$ = service.getUser();
      const user = await firstValueFrom(user$);

      expect(user).toEqual({
        accessToken: 'valid-access-token',
        claims: mockClaims
      });
    });

    it('should trigger refresh when token is within 1 minute of expiration', async () => {
      const now = Math.floor(Date.now() / 1000);
      const expiringTokens = {
        accessToken: 'expiring-access-token',
        refreshToken: 'valid-refresh-token',
        expiresAt: now + 30, // 30 seconds from now (within 1 minute)
        claims: {
          sub: 'old-user-id',
          email: 'old@example.com',
          email_verified: true,
          family_name: 'Old',
          given_name: 'User',
          name: 'Old User',
          picture: 'https://example.com/old-avatar.jpg'
        }
      };

      localStorage.setItem('openid_tokens', JSON.stringify(expiringTokens));

      mockClient.discovery.mockResolvedValue({
        authorization_endpoint: 'https://auth.example.com/authorize'
      } as any);

      const newClaims = {
        sub: 'new-user-id',
        email: 'new@example.com',
        email_verified: true,
        family_name: 'New',
        given_name: 'User',
        name: 'New User',
        picture: 'https://example.com/new-avatar.jpg'
      };

      const refreshedTokens = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        claims: () => newClaims
      };

      mockClient.refreshTokenGrant.mockResolvedValue(refreshedTokens);

      const user$ = service.getUser();
      const user = await firstValueFrom(user$);

      expect(user).toEqual({
        accessToken: 'new-access-token',
        claims: newClaims
      });
      expect(mockClient.refreshTokenGrant).toHaveBeenCalledWith(
        expect.any(Object),
        'valid-refresh-token',
        { scopes: 'openid email profile offline_access' }
      );
    });

    it('should trigger refresh when token is already expired', async () => {
      const now = Math.floor(Date.now() / 1000);
      const expiredTokens = {
        accessToken: 'expired-access-token',
        refreshToken: 'valid-refresh-token',
        expiresAt: now - 60, // 1 minute ago (expired)
        claims: {
          sub: 'old-user-id',
          email: 'old@example.com',
          email_verified: true,
          family_name: 'Old',
          given_name: 'User',
          name: 'Old User',
          picture: 'https://example.com/old-avatar.jpg'
        }
      };

      localStorage.setItem('openid_tokens', JSON.stringify(expiredTokens));

      mockClient.discovery.mockResolvedValue({
        authorization_endpoint: 'https://auth.example.com/authorize'
      } as any);

      const newClaims = {
        sub: 'new-user-id',
        email: 'new@example.com',
        email_verified: true,
        family_name: 'New',
        given_name: 'User',
        name: 'New User',
        picture: 'https://example.com/new-avatar.jpg'
      };

      const refreshedTokens = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        claims: () => newClaims
      };

      mockClient.refreshTokenGrant.mockResolvedValue(refreshedTokens);

      const user$ = service.getUser();
      const user = await firstValueFrom(user$);

      expect(user).toEqual({
        accessToken: 'new-access-token',
        claims: newClaims
      });
      expect(mockClient.refreshTokenGrant).toHaveBeenCalled();
    });

    it('should handle refresh failure by clearing tokens', async () => {
      const now = Math.floor(Date.now() / 1000);
      const expiringTokens = {
        accessToken: 'expiring-access-token',
        refreshToken: 'valid-refresh-token',
        expiresAt: now + 30,
        claims: {
          sub: 'test-user-id',
          email: 'test@example.com',
          email_verified: true,
          family_name: 'Test',
          given_name: 'User',
          name: 'Test User',
          picture: 'https://example.com/avatar.jpg'
        }
      };

      localStorage.setItem('openid_tokens', JSON.stringify(expiringTokens));

      mockClient.discovery.mockResolvedValue({
        authorization_endpoint: 'https://auth.example.com/authorize'
      } as any);

      mockClient.refreshTokenGrant.mockRejectedValue(new Error('Refresh failed'));

      const user$ = service.getUser();
      const user = await firstValueFrom(user$);

      expect(user).toBeNull();
      expect(localStorage.getItem('openid_tokens')).toBeNull();
    });

    it('should not trigger multiple concurrent refreshes', async () => {
      const now = Math.floor(Date.now() / 1000);
      const expiringTokens = {
        accessToken: 'expiring-access-token',
        refreshToken: 'valid-refresh-token',
        expiresAt: now + 30,
        claims: {
          sub: 'test-user-id',
          email: 'test@example.com',
          email_verified: true,
          family_name: 'Test',
          given_name: 'User',
          name: 'Test User',
          picture: 'https://example.com/avatar.jpg'
        }
      };

      localStorage.setItem('openid_tokens', JSON.stringify(expiringTokens));

      mockClient.discovery.mockResolvedValue({
        authorization_endpoint: 'https://auth.example.com/authorize'
      } as any);

      const newClaims = {
        sub: 'new-user-id',
        email: 'new@example.com',
        email_verified: true,
        family_name: 'New',
        given_name: 'User',
        name: 'New User',
        picture: 'https://example.com/new-avatar.jpg'
      };

      const refreshedTokens = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        claims: () => newClaims
      };

      mockClient.refreshTokenGrant.mockResolvedValue(refreshedTokens);

      // Make multiple concurrent calls
      const user1$ = service.getUser();
      const user2$ = service.getUser();
      const user3$ = service.getUser();

      const [user1, user2, user3] = await Promise.all([
        firstValueFrom(user1$),
        firstValueFrom(user2$),
        firstValueFrom(user3$)
      ]);

      const expectedUser = {
        accessToken: 'new-access-token',
        claims: newClaims
      };

      expect(user1).toEqual(expectedUser);
      expect(user2).toEqual(expectedUser);
      expect(user3).toEqual(expectedUser);

      // Should only call refresh once
      expect(mockClient.refreshTokenGrant).toHaveBeenCalledTimes(1);
    });

    it('should return null when user logs out (reset is called)', async () => {
      const mockClaims = {
        sub: 'test-user-id',
        email: 'test@example.com',
        email_verified: true,
        family_name: 'Test',
        given_name: 'User',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg'
      };

      const now = Math.floor(Date.now() / 1000);
      const tokens = {
        accessToken: 'valid-access-token',
        refreshToken: 'valid-refresh-token',
        expiresAt: now + 3600,
        claims: mockClaims
      };

      localStorage.setItem('openid_tokens', JSON.stringify(tokens));

      // First, verify user is available
      const initialUser$ = service.getUser();
      const initialUser = await firstValueFrom(initialUser$);
      expect(initialUser).toEqual({
        accessToken: 'valid-access-token',
        claims: mockClaims
      });

      // Reset (simulate logout)
      service.reset();

      // Check that user is now null
      const userAfterReset$ = service.getUser();
      const userAfterReset = await firstValueFrom(userAfterReset$);
      expect(userAfterReset).toBeNull();
    });
  });

  describe('reset', () => {
    it('should clear cached state and trigger fresh attempt', async () => {
      const mockLoginUrl = new URL('https://auth.example.com/authorize?prompt=login');
      const mockRegisterUrl = new URL('https://auth.example.com/authorize?prompt=registration');

      mockClient.discovery.mockResolvedValue({
        authorization_endpoint: 'https://auth.example.com/authorize'
      } as any);
      mockClient.randomPKCECodeVerifier.mockReturnValue('test-verifier');
      mockClient.calculatePKCECodeChallenge.mockResolvedValue('test-challenge');
      mockClient.randomState.mockReturnValue('test-state');
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

    it('should recover from error after reset() is called', async () => {
      mockClient.discovery
        .mockRejectedValueOnce(new Error('Discovery failed'))
        .mockResolvedValueOnce({
          authorization_endpoint: 'https://auth.example.com/authorize'
        } as any);

      mockClient.randomPKCECodeVerifier.mockReturnValue('test-verifier');
      mockClient.calculatePKCECodeChallenge.mockResolvedValue('test-challenge');
      mockClient.randomState.mockReturnValue('test-state');
      mockClient.buildAuthorizationUrl.mockReturnValue(new URL('https://auth.example.com/authorize'));

      const redirectUrls$ = service.getRedirectUrls();
      let error: Error | null = null;

      redirectUrls$.subscribe({
        next: () => { },
        error: err => error = err
      });

      // Wait for first error
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(error).toBeDefined();

      // Reset and try again
      service.reset();
      error = null;

      const newRedirectUrls$ = service.getRedirectUrls();
      newRedirectUrls$.subscribe({
        next: () => { },
        error: err => error = err
      });

      // Wait for second attempt
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(error).toBeNull();
    });
  });
}); 
