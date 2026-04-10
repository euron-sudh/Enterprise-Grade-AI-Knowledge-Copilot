import { withAuth } from 'next-auth/middleware';

// Protect dashboard routes — redirect unauthenticated users to /login.
// Public routes (/, /login, /register, /forgot-password, etc.) are not listed
// here so they are always accessible without a session.
export default withAuth({
  pages: {
    signIn: '/login',
  },
});

export const config = {
  matcher: [
    '/home/:path*',
    '/chat/:path*',
    '/knowledge-base/:path*',
    '/search/:path*',
    '/agents/:path*',
    '/workflows/:path*',
    '/analytics/:path*',
    '/meetings/:path*',
    '/voice/:path*',
    '/video/:path*',
    '/admin/:path*',
    '/profile/:path*',
    '/teams/:path*',
    '/notifications/:path*',
    '/playground/:path*',
  ],
};
