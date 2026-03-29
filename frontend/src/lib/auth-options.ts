import { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import AzureADProvider from 'next-auth/providers/azure-ad';

import { login } from '@/lib/api/auth';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env['GOOGLE_CLIENT_ID'] ?? '',
      clientSecret: process.env['GOOGLE_CLIENT_SECRET'] ?? '',
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),

    AzureADProvider({
      clientId: process.env['AZURE_AD_CLIENT_ID'] ?? '',
      clientSecret: process.env['AZURE_AD_CLIENT_SECRET'] ?? '',
      tenantId: process.env['AZURE_AD_TENANT_ID'] ?? 'common',
    }),

    CredentialsProvider({
      name: 'Email & Password',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'you@company.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        try {
          const authResponse = await login({
            email: credentials.email,
            password: credentials.password,
          });
          return {
            id: authResponse.user.id,
            name: authResponse.user.name,
            email: authResponse.user.email,
            image: authResponse.user.avatarUrl,
            accessToken: authResponse.accessToken,
            refreshToken: authResponse.refreshToken,
          };
        } catch {
          return null;
        }
      },
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.accessToken = (user as { accessToken?: string }).accessToken;
        token.refreshToken = (user as { refreshToken?: string }).refreshToken;
      }
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session as { accessToken?: unknown }).accessToken = token.accessToken;
      }
      return session;
    },
  },

  secret: process.env['NEXTAUTH_SECRET'],

  debug: process.env['NODE_ENV'] === 'development',
};
