import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4001';

export async function PATCH(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('__session_token')?.value;

  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Decode user ID from JWT
  let userId: number;
  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64').toString(),
    );
    userId = payload.sub;
  } catch {
    return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
  }

  const body = await request.json();

  const res = await fetch(
    `${AUTH_SERVICE_URL}/credentials/${userId}/change-password`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to change password' }));
    return NextResponse.json(error, { status: res.status });
  }

  const data = await res.json().catch(() => ({ success: true }));
  return NextResponse.json(data);
}
