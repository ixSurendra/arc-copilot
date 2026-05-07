import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const BFF_URL = process.env.BFF_INTERNAL_URL || 'http://localhost:6006';

async function proxyRequest(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const bffPath = '/' + path.join('/');
  const cookieStore = await cookies();
  const token = cookieStore.get('__session_token')?.value;

  const url = new URL(bffPath, BFF_URL);

  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const body = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method)
    ? await request.text()
    : undefined;

  const res = await fetch(url.toString(), {
    method: request.method,
    headers,
    body,
  });

  // 204 No Content cannot have a body in the Response constructor
  if (res.status === 204) {
    return new NextResponse(null, { status: 200 });
  }

  const data = await res.text();

  return new NextResponse(data, {
    status: res.status,
    headers: {
      'Content-Type': res.headers.get('Content-Type') || 'application/json',
    },
  });
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PATCH = proxyRequest;
export const PUT = proxyRequest;
export const DELETE = proxyRequest;
