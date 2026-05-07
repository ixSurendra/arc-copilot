import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

const BFF_URL = process.env.BFF_INTERNAL_URL || 'http://localhost:6006';

/**
 * Decode a JWT and return its payload (without verification).
 * Returns null if the token is malformed.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8'),
    );
    return payload;
  } catch {
    return null;
  }
}

/**
 * Check whether a JWT has expired (or will expire within a buffer window).
 * A 60-second buffer ensures we refresh slightly before actual expiry,
 * avoiding edge cases where the token expires mid-SSR-render.
 */
function isTokenExpired(token: string, bufferSeconds = 60): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload['exp'] !== 'number') return true;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return payload['exp'] - bufferSeconds <= nowSeconds;
}

/**
 * Attempt a server-side token refresh using the refresh token cookie.
 * Returns { accessToken, refreshToken } on success, null on failure.
 */
async function refreshTokens(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    const res = await fetch(`${BFF_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    };
  } catch {
    return null;
  }
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip for API routes and static assets
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/') || pathname.startsWith('/images/') || pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  // Run intl middleware
  const response = intlMiddleware(request);

  // ── Proactive JWT refresh for protected routes ──────────────────────
  // If the access token is expired but the refresh token is still valid,
  // refresh now so SSR page renders get a valid token.
  const isProtectedRoute = /^\/(en|ar)\/(admin|change-password)/.test(pathname);

  if (isProtectedRoute) {
    const sessionToken = request.cookies.get('__session_token')?.value;
    const refreshTokenValue = request.cookies.get('__refresh_token')?.value;

    // No token and no refresh token → redirect to login
    if (!sessionToken && !refreshTokenValue) {
      const locale = pathname.split('/')[1] || 'en';
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Token exists but is expired → try server-side refresh.
    // This keeps SSR pages working by providing a fresh token via cookies().
    // The refreshed tokens are set on the response so the browser picks them
    // up, and the client-side fetcher (use-api.ts) will use the new cookie.
    if (sessionToken && isTokenExpired(sessionToken) && refreshTokenValue) {
      const tokens = await refreshTokens(refreshTokenValue);
      if (tokens) {
        const isSecure = process.env.COOKIE_SECURE === 'true';
        const domain = process.env.COOKIE_DOMAIN || undefined;
        const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60;

        response.cookies.set('__session_token', tokens.accessToken, {
          httpOnly: true,
          secure: isSecure,
          sameSite: 'lax',
          path: '/',
          domain,
          maxAge: REFRESH_TOKEN_MAX_AGE,
        });

        response.cookies.set('__refresh_token', tokens.refreshToken, {
          httpOnly: true,
          secure: isSecure,
          sameSite: 'lax',
          path: '/',
          domain,
          maxAge: REFRESH_TOKEN_MAX_AGE,
        });

        return response;
      }

      // Refresh failed — don't redirect immediately. Let the page load so the
      // client-side fetcher can attempt its own refresh. This avoids a race
      // where middleware revokes the refresh token before the client can use it.
    }
  }

  // Redirect auth pages if already authenticated
  const isAuthPage = /^\/(en|ar)\/(login|forgot-password|reset-password)/.test(pathname);
  if (isAuthPage) {
    const token = request.cookies.get('__session_token')?.value;
    if (token && !isTokenExpired(token)) {
      const locale = pathname.split('/')[1] || 'en';
      return NextResponse.redirect(new URL(`/${locale}/admin/dashboard`, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next|images|favicon.ico).*)'],
};
