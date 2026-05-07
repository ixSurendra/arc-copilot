import { NextRequest, NextResponse } from 'next/server';

const BFF_URL = process.env.BFF_INTERNAL_URL || 'http://localhost:4006';

export async function POST(request: NextRequest) {
  const body = await request.json();

  const res = await fetch(`${BFF_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Login failed' }));
    return NextResponse.json(error, { status: res.status });
  }

  const data = await res.json();
  const { accessToken, refreshToken, user } = data;

  // Only SUPER_ADMIN and TENANT_ADMIN can access the admin portal
  const ALLOWED_ADMIN_ROLES = ['SUPER_ADMIN', 'TENANT_ADMIN'];
  const userRoles: string[] = user?.roles || [];
  const hasAdminAccess = userRoles.some((role: string) =>
    ALLOWED_ADMIN_ROLES.includes(role),
  );

  if (!hasAdminAccess) {
    return NextResponse.json(
      { message: 'You do not have permission to access the admin portal.' },
      { status: 403 },
    );
  }

  const isSecure = process.env.COOKIE_SECURE === 'true';
  const domain = process.env.COOKIE_DOMAIN || undefined;

  const response = NextResponse.json({ user });

  // maxAge must outlive the JWT so the cookie persists for the refresh flow.
  // Actual JWT expiry is enforced server-side; the cookie is just transport.
  const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7 days (matches refresh token)

  response.cookies.set('__session_token', accessToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    domain,
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });

  response.cookies.set('__refresh_token', refreshToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    domain,
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  return response;
}
