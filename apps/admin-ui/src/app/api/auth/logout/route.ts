import { NextRequest, NextResponse } from 'next/server';

const BFF_URL = process.env.BFF_INTERNAL_URL || 'http://localhost:6006';

export async function POST(request: NextRequest) {
  const token = request.cookies.get('__session_token')?.value;

  if (token) {
    try {
      await fetch(`${BFF_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      // Ignore errors during logout
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete('__session_token');
  response.cookies.delete('__refresh_token');
  return response;
}
