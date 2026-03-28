/**
 * Client-side backend token manager.
 *
 * When a user signs in via OAuth (Microsoft/Google), the NextAuth session may
 * hold the OAuth provider token instead of a backend JWT. This module detects
 * that situation (401 from backend) and transparently exchanges the OAuth
 * identity for a backend JWT via /auth/oauth-login, then caches it in
 * sessionStorage for the lifetime of the browser tab.
 */

const STORAGE_KEY = 'kf_backend_token';
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8010';

/** Return the cached backend token (if any). */
export function getCachedToken(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Persist a backend token for the current tab session. */
export function setCachedToken(token: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, token);
  } catch {}
}

/** Clear the cached token (e.g. on sign-out). */
export function clearCachedToken(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {}
}

/**
 * Exchange an OAuth user identity for a backend JWT.
 * Returns the backend access token, or null on failure.
 */
export async function exchangeOAuthToken(user: {
  email?: string | null;
  name?: string | null;
  image?: string | null;
}): Promise<string | null> {
  if (!user.email) return null;
  try {
    const res = await fetch(`${API_URL}/auth/oauth-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        name: user.name ?? user.email,
        provider: 'oauth',
        avatarUrl: user.image ?? null,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const token: string = data.accessToken;
    setCachedToken(token);
    return token;
  } catch {
    return null;
  }
}

/**
 * Returns the best available backend token:
 * 1. Cached token from a prior exchange
 * 2. Session accessToken (works for email/password logins)
 */
export function getBestToken(sessionToken?: string | null): string {
  return getCachedToken() ?? sessionToken ?? '';
}

/**
 * Perform an authenticated fetch with automatic 401 retry.
 *
 * On first 401, clears the cached token and tries to exchange a fresh one
 * using the provided user identity, then retries the original request once.
 */
export async function authFetch(
  url: string,
  options: RequestInit,
  sessionToken: string | null | undefined,
  user: { email?: string | null; name?: string | null; image?: string | null },
): Promise<Response> {
  const token = getBestToken(sessionToken);
  const headers = {
    ...(options.headers ?? {}),
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(url, { ...options, headers });

  if (res.status !== 401) return res;

  // 401 — try to exchange OAuth identity for a backend JWT
  clearCachedToken();
  const freshToken = await exchangeOAuthToken(user);
  if (!freshToken) return res; // give up, return original 401

  const retryHeaders = {
    ...(options.headers ?? {}),
    Authorization: `Bearer ${freshToken}`,
  };
  return fetch(url, { ...options, headers: retryHeaders });
}
