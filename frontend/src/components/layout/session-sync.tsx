'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { setApiToken } from '@/lib/api/client';

/**
 * Syncs the NextAuth session accessToken into the axios apiClient so all
 * apiClient calls get the correct Authorization header automatically.
 * Rendered once inside the dashboard layout.
 */
export function SessionSync() {
  const { data: session } = useSession();

  useEffect(() => {
    setApiToken((session as any)?.accessToken ?? null);
  }, [session]);

  return null;
}
