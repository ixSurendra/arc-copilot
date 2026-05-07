import { NextRequest, NextResponse } from 'next/server';

const BFF_URL = process.env.BFF_INTERNAL_URL || 'http://localhost:6006';

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get('__refresh_token')?.value;

  if (!refreshToken) {
    return NextResponse.json({ message: 'No refresh token' }, { status: 401 });
  }

  const res = await fetch(`${BFF_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    const response = NextResponse.json(
      { message: 'Refresh failed' },
      { status: 401 },
    );
    response.cookies.delete('__session_token');
    response.cookies.delete('__refresh_token');
    return response;
  }

  const data = await res.json();
  const isSecure = process.env.COOKIE_SECURE === 'true';
  const domain = process.env.COOKIE_DOMAIN || undefined;

  const response = NextResponse.json({ success: true });

  // maxAge must outlive the JWT so the cookie persists for the refresh flow.
  // Actual JWT expiry is enforced server-side; the cookie is just transport.
  const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7 days (matches refresh token)

  response.cookies.set('__session_token', data.accessToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    domain,
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });

  response.cookies.set('__refresh_token', data.refreshToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    domain,
    maxAge: 7 * 24 * 60 * 60,
  });

  return response;
}
