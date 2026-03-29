'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { setApiToken } from '@/lib/api/client';
import { getCachedToken, exchangeOAuthToken } from '@/lib/api/token';

/**
 * Syncs the best available backend JWT into the axios apiClient so all
 * apiClient calls get the correct Authorization header automatically.
 * For OAuth users, prefers the sessionStorage-cached backend JWT over
 * the raw OAuth provider token stored in session.accessToken.
 */
export function SessionSync() {
  const { data: session } = useSession();

  useEffect(() => {
    if (!session) { setApiToken(null); return; }

    // 1. Prefer the cached backend JWT (set by a prior authFetch exchange)
    const cached = getCachedToken();
    if (cached) { setApiToken(cached); return; }

    const sessionToken = (session as any)?.accessToken as string | undefined;

    // 2. Credentials login: session.accessToken IS the backend JWT — use it directly
    if (sessionToken) {
      setApiToken(sessionToken);
      return;
    }

    // 3. OAuth login without a backend JWT yet — exchange the identity now
    if (session.user?.email) {
      exchangeOAuthToken({
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
      }).then(backendToken => {
        if (backendToken) setApiToken(backendToken);
      }).catch(() => {});
    }
  }, [session]);

  return null;
}
