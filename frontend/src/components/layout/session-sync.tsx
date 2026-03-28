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

    // Prefer the cached backend JWT (set by authFetch on 401 exchange)
    const cached = getCachedToken();
    if (cached) { setApiToken(cached); return; }

    const sessionToken = (session as any)?.accessToken as string | undefined;

    // If session has a token, try to use it — but it may be an OAuth provider
    // token. Try exchanging it for a backend JWT first.
    if (session.user?.email) {
      exchangeOAuthToken({
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
      }).then(backendToken => {
        setApiToken(backendToken ?? sessionToken ?? null);
      }).catch(() => {
        setApiToken(sessionToken ?? null);
      });
    } else {
      setApiToken(sessionToken ?? null);
    }
  }, [session]);

  return null;
}
