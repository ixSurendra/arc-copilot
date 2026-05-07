import { NextRequest, NextResponse } from 'next/server';

const BFF_URL = process.env.BFF_INTERNAL_URL || 'http://localhost:6006';

export async function POST(request: NextRequest) {
  const body = await request.json();

  const res = await fetch(`${BFF_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({ message: 'Request failed' }));
  return NextResponse.json(data, { status: res.status });
}
