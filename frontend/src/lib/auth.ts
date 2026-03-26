import { NextAuthOptions, DefaultSession } from 'next-auth';

// Extend NextAuth session type
declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    error?: string;
    user: DefaultSession['user'] & {
      id: string;
      role: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: string;
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpiry?: number; // unix ms
    error?: string;
  }
}

import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import AzureADProvider from 'next-auth/providers/azure-ad';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8010';
// Refresh 2 minutes before expiry
const REFRESH_BUFFER_MS = 2 * 60 * 1000;

async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  accessTokenExpiry: number;
} | null> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { accessToken: string; refreshToken?: string };
    // Backend token TTL is ACCESS_TOKEN_EXPIRE_MINUTES (60 min default)
    const expiry = Date.now() + 58 * 60 * 1000; // 58 min — slightly under 60
    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken ?? refreshToken,
      accessTokenExpiry: expiry,
    };
  } catch {
    return null;
  }
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Email & Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          if (!res.ok) return null;

          const data = await res.json() as {
            user: { id: string; email: string; name: string; role: string; avatarUrl?: string };
            accessToken: string;
            refreshToken?: string;
          };

          return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role,
            image: data.user.avatarUrl ?? null,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken ?? '',
          };
        } catch {
          return null;
        }
      },
    }),

    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
              params: {
                prompt: 'consent',
                access_type: 'offline',
                response_type: 'code',
              },
            },
          }),
        ]
      : []),

    ...(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET
      ? [
          AzureADProvider({
            clientId: process.env.AZURE_AD_CLIENT_ID!,
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
            tenantId: process.env.AZURE_AD_TENANT_ID,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign-in — store tokens from backend
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? 'member';
        token.accessToken = (user as { accessToken?: string }).accessToken;
        token.refreshToken = (user as { refreshToken?: string }).refreshToken ?? '';
        token.accessTokenExpiry = Date.now() + 58 * 60 * 1000;
        token.error = undefined;
        return token;
      }

      // OAuth providers (Google, Azure)
      if (account?.access_token) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token ?? '';
        token.accessTokenExpiry = Date.now() + 58 * 60 * 1000;
        return token;
      }

      // Token still valid — return as-is
      if (token.accessTokenExpiry && Date.now() < token.accessTokenExpiry - REFRESH_BUFFER_MS) {
        return token;
      }

      // Access token expired (or expiry not set) — try refresh
      if (!token.refreshToken) {
        return { ...token, error: 'RefreshTokenMissing' };
      }

      const refreshed = await refreshAccessToken(token.refreshToken);
      if (!refreshed) {
        return { ...token, error: 'RefreshAccessTokenError' };
      }

      return {
        ...token,
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        accessTokenExpiry: refreshed.accessTokenExpiry,
        error: undefined,
      };
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id ?? '';
        session.accessToken = token.accessToken;
        session.user.role = token.role ?? 'member';
        session.error = token.error;
      }
      return session;
    },
  },
};
