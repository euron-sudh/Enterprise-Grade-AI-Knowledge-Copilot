/**
 * Google OAuth callback — server-side proxy to FastAPI.
 *
 * Google redirects the browser to:
 *   http://127.0.0.1:3001/api/backend/knowledge/connectors/oauth/google/callback?code=...&state=...
 *
 * This Next.js API route receives that request server-side (plain HTTP, no SSL),
 * forwards it to the FastAPI backend, then returns the final redirect to the browser.
 *
 * Using 127.0.0.1 instead of localhost avoids Chrome's automatic HTTPS upgrade
 * (HSTS / HTTPS-first mode) which causes ERR_SSL_PROTOCOL_ERROR on plain-HTTP dev servers.
 *
 * This route file takes priority over the /api/backend/* rewrite in next.config.js.
 */
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    console.error('[Google OAuth] Error from Google:', error);
    return NextResponse.redirect(new URL('/knowledge-base?oauth_error=' + encodeURIComponent(error), request.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/knowledge-base?oauth_error=missing_params', request.url));
  }

  const backendUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001';

  const params = new URLSearchParams({ code, state });
  const backendCallbackUrl = `${backendUrl}/knowledge/connectors/oauth/google/callback?${params}`;

  try {
    // Server-side request to FastAPI — no SSL issues here.
    // FastAPI will: exchange code for tokens, save connector, trigger sync,
    // then return a 302 redirect to /knowledge-base?connected=<type>.
    const resp = await fetch(backendCallbackUrl, {
      redirect: 'manual', // Capture the redirect without following it
    });

    if (resp.status >= 300 && resp.status < 400) {
      const location = resp.headers.get('location') ?? '';
      // FastAPI returns an absolute URL like http://127.0.0.1:3001/knowledge-base?connected=...
      // Extract just the path + query so the redirect works on any host/port.
      try {
        const redirected = new URL(location);
        return NextResponse.redirect(new URL(redirected.pathname + redirected.search, request.url));
      } catch {
        // location is already a relative path
        return NextResponse.redirect(new URL(location, request.url));
      }
    }

    // Unexpected non-redirect from backend
    const body = await resp.text();
    console.error('[Google OAuth] Unexpected backend response:', resp.status, body.slice(0, 200));
    return NextResponse.redirect(new URL('/knowledge-base?oauth_error=backend_error', request.url));
  } catch (err) {
    console.error('[Google OAuth] Failed to reach backend:', err);
    return NextResponse.redirect(new URL('/knowledge-base?oauth_error=unreachable', request.url));
  }
}
