import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '@afh/shared';

const mockUser: AuthUser = {
  id: 'user-1',
  email: 'staff@demo.afh',
  role: 'staff',
  facilityId: 'facility-1',
  staffId: 'staff-1',
  profileComplete: true,
};

const authState: {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  setAuth: ReturnType<typeof vi.fn>;
  updateUser: ReturnType<typeof vi.fn>;
  clearAuth: ReturnType<typeof vi.fn>;
} = {
  accessToken: 'expired-access-token',
  refreshToken: 'valid-refresh-token',
  user: mockUser,
  setAuth: vi.fn((accessToken: string, refreshToken: string, user: AuthUser) => {
    authState.accessToken = accessToken;
    authState.refreshToken = refreshToken;
    authState.user = user;
  }),
  updateUser: vi.fn((patch: Partial<AuthUser>) => {
    if (authState.user) {
      authState.user = { ...authState.user, ...patch };
    }
  }),
  clearAuth: vi.fn(() => {
    authState.accessToken = null;
    authState.refreshToken = null;
    authState.user = null;
  }),
};

vi.mock('../stores/auth.store', () => ({
  useAuthStore: {
    getState: () => authState,
  },
}));

describe('api auth refresh', () => {
  beforeEach(() => {
    authState.accessToken = 'expired-access-token';
    authState.refreshToken = 'valid-refresh-token';
    authState.user = mockUser;
    authState.setAuth.mockClear();
    authState.updateUser.mockClear();
    authState.clearAuth.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('refreshes the access token and retries after a 401', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Invalid or expired token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          accessToken: 'fresh-access-token',
          refreshToken: 'fresh-refresh-token',
          user: mockUser,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ user: mockUser }),
      });

    vi.stubGlobal('fetch', fetchMock);

    const { api } = await import('./api');
    const result = await api.me();

    expect(result.user.email).toBe('staff@demo.afh');
    expect(authState.setAuth).toHaveBeenCalledWith(
      'fresh-access-token',
      'fresh-refresh-token',
      mockUser,
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('clears auth when refresh fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Invalid or expired token' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Invalid refresh token' }),
      });

    vi.stubGlobal('fetch', fetchMock);

    const { api } = await import('./api');

    await expect(api.me()).rejects.toMatchObject({
      message: 'Your session expired. Please sign in again.',
      status: 401,
    });
    expect(authState.clearAuth).toHaveBeenCalled();
  });

  it('syncs the current user during bootstrap', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ user: { ...mockUser, profileComplete: true } }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const { api } = await import('./api');
    await api.bootstrapSession();

    expect(authState.updateUser).toHaveBeenCalledWith({
      ...mockUser,
      profileComplete: true,
    });
  });
});
