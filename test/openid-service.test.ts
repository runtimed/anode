import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { OpenIdService, OpenIdClient, RedirectUrls } from '../src/services/openid';

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
      expect(secondState).toEqual({
        loginUrl: mockLoginUrl,
        registrationUrl: mockRegisterUrl
      });
      expect(mockClient.randomPKCECodeVerifier).toHaveBeenCalledTimes(1); // Only called once due to caching
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
        .mockReturnValueOnce(mockRegisterUrl)
        .mockReturnValueOnce(mockLoginUrl)
        .mockReturnValueOnce(mockRegisterUrl)
        .mockReturnValueOnce(mockLoginUrl)
        .mockReturnValueOnce(mockRegisterUrl);

      // Initial subscription
      const initialState = await firstValueFrom(service.getRedirectUrls());

      // Reset and subscribe again
      service.reset();
      const resetState = await firstValueFrom(service.getRedirectUrls());

      expect(initialState).toEqual({
        loginUrl: mockLoginUrl,
        registrationUrl: mockRegisterUrl
      });
      expect(resetState).toEqual({
        loginUrl: mockLoginUrl,
        registrationUrl: mockRegisterUrl
      });

      // Discovery should be called twice (once for initial, once after reset)
      expect(mockClient.discovery).toHaveBeenCalledTimes(2);
    });

    it('should recover from error after reset() is called', async () => {
      const mockLoginUrl = new URL('https://auth.example.com/authorize?prompt=login');
      const mockRegisterUrl = new URL('https://auth.example.com/authorize?prompt=registration');

      // First attempt fails
      mockClient.discovery.mockRejectedValueOnce(new Error('Discovery failed'));

      // Second attempt succeeds (after reset)
      mockClient.discovery.mockResolvedValueOnce({
        authorization_endpoint: 'https://auth.example.com/authorize'
      } as any);

      mockClient.randomPKCECodeVerifier.mockReturnValue('test-verifier');
      mockClient.calculatePKCECodeChallenge.mockResolvedValue('test-challenge');
      mockClient.randomState.mockReturnValue('test-state');
      mockClient.buildAuthorizationUrl
        .mockReturnValueOnce(mockLoginUrl)
        .mockReturnValueOnce(mockRegisterUrl);

      // Simulate LoginPrompt pattern with error dependency:
      // 1. Initial subscription fails (like useEffect on mount)
      // 2. Error state changes, triggering new useEffect
      // 3. New subscription succeeds after reset()
      const results: Array<RedirectUrls | Error> = [];
      let hasError = false;

      // First subscription (fails)
      let subscription = service.getRedirectUrls().subscribe({
        next: (urls) => {
          results.push(urls);
        },
        error: (error) => {
          hasError = true;
          results.push(error);
        }
      });

      // Wait for first subscription to fail
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify error occurred
      expect(hasError).toBe(true);
      expect(results.length).toBe(1);
      expect(results[0]).toBeInstanceOf(Error);
      expect((results[0] as Error).message).toBe('Discovery failed');

      // Clean up first subscription (like useEffect cleanup)
      subscription.unsubscribe();

      // Simulate LoginPrompt: reset service and change error state
      // This triggers useEffect to run again due to error dependency change
      service.reset();

      // Create new subscription (simulates useEffect running again)
      subscription = service.getRedirectUrls().subscribe({
        next: (urls) => {
          results.push(urls);
        },
        error: (error) => {
          results.push(error);
        }
      });

      // Wait for second subscription to succeed
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should have received error first, then success after new subscription
      expect(results.length).toBe(2);
      expect(results[0]).toBeInstanceOf(Error);
      expect((results[0] as Error).message).toBe('Discovery failed');
      expect(results[1]).toEqual({
        loginUrl: mockLoginUrl,
        registrationUrl: mockRegisterUrl
      });

      // Discovery should be called twice (once failed, once succeeded)
      expect(mockClient.discovery).toHaveBeenCalledTimes(2);

      // Clean up
      subscription.unsubscribe();
    });

  });
}); 
