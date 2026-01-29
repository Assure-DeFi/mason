import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  buildAuthorizationUrl,
  saveOAuthSession,
  getOAuthSession,
  clearOAuthSession,
  hasValidOAuthSession,
  getAccessToken,
  getRefreshToken,
  updateTokens,
  setSelectedProject,
  getSelectedProject,
  exchangeCodeForTokens,
  refreshAccessToken,
  SUPABASE_OAUTH_CONFIG,
  type SupabaseOAuthTokens,
  type SupabaseOAuthSession,
} from '@/lib/supabase/oauth';
import { STORAGE_KEYS } from '@/lib/constants';

describe('OAuth PKCE Utilities', () => {
  describe('generateCodeVerifier', () => {
    it('should generate a string of correct length', () => {
      const verifier = generateCodeVerifier();
      // Base64 URL encoded 32 bytes = ~43 characters
      expect(verifier.length).toBeGreaterThanOrEqual(40);
      expect(verifier.length).toBeLessThanOrEqual(50);
    });

    it('should generate unique values', () => {
      const verifier1 = generateCodeVerifier();
      const verifier2 = generateCodeVerifier();
      expect(verifier1).not.toBe(verifier2);
    });

    it('should only contain URL-safe characters', () => {
      const verifier = generateCodeVerifier();
      // Base64 URL encoding uses only alphanumeric, dash, and underscore
      expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
    });
  });

  describe('generateCodeChallenge', () => {
    it('should generate a challenge from verifier', async () => {
      const verifier = 'test-verifier-string';
      const challenge = await generateCodeChallenge(verifier);

      expect(challenge).toBeTruthy();
      expect(typeof challenge).toBe('string');
      // Should be URL-safe base64
      expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should generate consistent challenges for same verifier', async () => {
      const verifier = 'consistent-verifier';
      const challenge1 = await generateCodeChallenge(verifier);
      const challenge2 = await generateCodeChallenge(verifier);

      expect(challenge1).toBe(challenge2);
    });

    it('should generate different challenges for different verifiers', async () => {
      const challenge1 = await generateCodeChallenge('verifier-one');
      const challenge2 = await generateCodeChallenge('verifier-two');

      expect(challenge1).not.toBe(challenge2);
    });
  });

  describe('generateState', () => {
    it('should generate a string', () => {
      const state = generateState();
      expect(typeof state).toBe('string');
      expect(state.length).toBeGreaterThan(0);
    });

    it('should generate unique values', () => {
      const state1 = generateState();
      const state2 = generateState();
      expect(state1).not.toBe(state2);
    });
  });
});

describe('OAuth Token Storage', () => {
  const mockTokens: SupabaseOAuthTokens = {
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    expiresAt: Date.now() + 3600 * 1000, // 1 hour from now
  };

  const mockSession: SupabaseOAuthSession = {
    tokens: mockTokens,
    selectedProjectRef: 'test-project-ref',
    selectedProjectName: 'Test Project',
  };

  describe('saveOAuthSession / getOAuthSession', () => {
    it('should save and retrieve session', () => {
      saveOAuthSession(mockSession);
      const retrieved = getOAuthSession();

      expect(retrieved).toEqual(mockSession);
    });

    it('should return null when no session exists', () => {
      const session = getOAuthSession();
      expect(session).toBeNull();
    });
  });

  describe('clearOAuthSession', () => {
    it('should clear the session', () => {
      saveOAuthSession(mockSession);
      clearOAuthSession();
      const session = getOAuthSession();

      expect(session).toBeNull();
    });
  });

  describe('hasValidOAuthSession', () => {
    it('should return false when no session exists', () => {
      expect(hasValidOAuthSession()).toBe(false);
    });

    it('should return true for non-expired session', () => {
      saveOAuthSession(mockSession);
      expect(hasValidOAuthSession()).toBe(true);
    });

    it('should return false for expired session', () => {
      const expiredSession: SupabaseOAuthSession = {
        tokens: {
          ...mockTokens,
          expiresAt: Date.now() - 1000, // Expired 1 second ago
        },
      };
      saveOAuthSession(expiredSession);
      expect(hasValidOAuthSession()).toBe(false);
    });

    it('should return false when token expires within 5 minutes', () => {
      const nearlyExpiredSession: SupabaseOAuthSession = {
        tokens: {
          ...mockTokens,
          expiresAt: Date.now() + 4 * 60 * 1000, // 4 minutes from now
        },
      };
      saveOAuthSession(nearlyExpiredSession);
      expect(hasValidOAuthSession()).toBe(false);
    });
  });

  describe('getAccessToken', () => {
    it('should return token for valid session', () => {
      saveOAuthSession(mockSession);
      expect(getAccessToken()).toBe(mockTokens.accessToken);
    });

    it('should return null for expired session', () => {
      const expiredSession: SupabaseOAuthSession = {
        tokens: {
          ...mockTokens,
          expiresAt: Date.now() - 1000,
        },
      };
      saveOAuthSession(expiredSession);
      expect(getAccessToken()).toBeNull();
    });

    it('should return null when no session', () => {
      expect(getAccessToken()).toBeNull();
    });
  });

  describe('getRefreshToken', () => {
    it('should return refresh token', () => {
      saveOAuthSession(mockSession);
      expect(getRefreshToken()).toBe(mockTokens.refreshToken);
    });

    it('should return null when no session', () => {
      expect(getRefreshToken()).toBeNull();
    });
  });

  describe('updateTokens', () => {
    it('should update tokens in existing session', () => {
      saveOAuthSession(mockSession);

      const newTokens: SupabaseOAuthTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresAt: Date.now() + 7200 * 1000,
      };

      updateTokens(newTokens);

      const session = getOAuthSession();
      expect(session?.tokens).toEqual(newTokens);
      // Should preserve other session data
      expect(session?.selectedProjectRef).toBe(mockSession.selectedProjectRef);
    });

    it('should create session if none exists', () => {
      const newTokens: SupabaseOAuthTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresAt: Date.now() + 7200 * 1000,
      };

      updateTokens(newTokens);

      const session = getOAuthSession();
      expect(session?.tokens).toEqual(newTokens);
    });
  });

  describe('setSelectedProject / getSelectedProject', () => {
    it('should set and get selected project', () => {
      saveOAuthSession({ tokens: mockTokens });

      setSelectedProject('project-123', 'My Project');

      const project = getSelectedProject();
      expect(project).toEqual({
        ref: 'project-123',
        name: 'My Project',
      });
    });

    it('should return null when no project selected', () => {
      saveOAuthSession({ tokens: mockTokens });
      expect(getSelectedProject()).toBeNull();
    });

    it('should return null when no session', () => {
      expect(getSelectedProject()).toBeNull();
    });
  });
});

describe('OAuth URL Construction', () => {
  describe('buildAuthorizationUrl', () => {
    it('should build correct authorization URL', () => {
      const url = buildAuthorizationUrl(
        'test-client-id',
        'https://example.com/callback',
        'test-code-challenge',
        'test-state',
      );

      const parsed = new URL(url);

      expect(parsed.origin + parsed.pathname).toBe(
        SUPABASE_OAUTH_CONFIG.authorizationEndpoint,
      );
      expect(parsed.searchParams.get('client_id')).toBe('test-client-id');
      expect(parsed.searchParams.get('redirect_uri')).toBe(
        'https://example.com/callback',
      );
      expect(parsed.searchParams.get('response_type')).toBe('code');
      expect(parsed.searchParams.get('code_challenge')).toBe(
        'test-code-challenge',
      );
      expect(parsed.searchParams.get('code_challenge_method')).toBe('S256');
      expect(parsed.searchParams.get('state')).toBe('test-state');
    });

    it('should include all required scopes', () => {
      const url = buildAuthorizationUrl(
        'client-id',
        'https://example.com/callback',
        'challenge',
        'state',
      );

      const parsed = new URL(url);
      const scopes = parsed.searchParams.get('scope');

      expect(scopes).toContain('database:write');
      expect(scopes).toContain('api-keys:read');
      expect(scopes).toContain('projects:read');
    });
  });
});

describe('OAuth Token Exchange', () => {
  describe('exchangeCodeForTokens', () => {
    it('should exchange code for tokens', async () => {
      const mockResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const tokens = await exchangeCodeForTokens({
        code: 'auth-code',
        codeVerifier: 'verifier',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        redirectUri: 'https://example.com/callback',
      });

      expect(tokens.accessToken).toBe('new-access-token');
      expect(tokens.refreshToken).toBe('new-refresh-token');
      expect(tokens.expiresAt).toBeGreaterThan(Date.now());

      // Verify fetch was called correctly
      expect(fetch).toHaveBeenCalledWith(
        SUPABASE_OAUTH_CONFIG.tokenEndpoint,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );
    });

    it('should throw on error response', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'invalid_grant',
          error_description: 'Code expired',
        }),
      } as Response);

      await expect(
        exchangeCodeForTokens({
          code: 'expired-code',
          codeVerifier: 'verifier',
          clientId: 'client-id',
          clientSecret: 'client-secret',
          redirectUri: 'https://example.com/callback',
        }),
      ).rejects.toThrow('Code expired');
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh access token', async () => {
      const mockResponse = {
        access_token: 'refreshed-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const tokens = await refreshAccessToken({
        refreshToken: 'old-refresh-token',
        clientId: 'client-id',
        clientSecret: 'client-secret',
      });

      expect(tokens.accessToken).toBe('refreshed-access-token');
      expect(tokens.refreshToken).toBe('new-refresh-token');
    });

    it('should throw on error response', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'invalid_token',
          error_description: 'Refresh token expired',
        }),
      } as Response);

      await expect(
        refreshAccessToken({
          refreshToken: 'expired-token',
          clientId: 'client-id',
          clientSecret: 'client-secret',
        }),
      ).rejects.toThrow('Refresh token expired');
    });
  });
});
