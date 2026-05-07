import { ApiError } from './api-client';
import { checkLicenseExpiredResponse } from './license-expired-event';

/**
 * Single refresh promise — shared across all concurrent clientFetch calls.
 * Prevents race conditions with refresh token rotation.
 */
let refreshPromise: Promise<boolean> | null = null;

function doRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include',
  })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => { refreshPromise = null; });
  return refreshPromise;
}

export async function clientFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (res.status === 401) {
    const refreshed = await doRefresh();
    if (refreshed) {
      return clientFetch<T>(path, options);
    }
    const locale = window.location.pathname.split('/')[1] || 'en';
    window.location.href = `/${locale}/login?reason=session_expired`;
    throw new ApiError(401, 'Session expired');
  }

  // Check for license expiration before general error handling
  if (res.status === 403) {
    const isLicenseExpired = await checkLicenseExpiredResponse(res);
    if (isLicenseExpired) {
      throw new ApiError(403, 'License expired');
    }
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    const statusMessages: Record<number, string> = {
      400: 'Invalid request. Please check your input.',
      403: 'You do not have permission to perform this action.',
      404: 'The requested resource was not found.',
      409: error.message || 'A conflict occurred. This record may already exist.',
      429: 'Too many requests. Please wait a moment and try again.',
      500: 'An internal server error occurred. Please try again later.',
      502: 'Service is temporarily unavailable. Please try again.',
      503: 'Service is temporarily unavailable. Please try again.',
      504: 'The request timed out. Please try again.',
    };
    const message = error.message || statusMessages[res.status] || `Request failed (${res.status})`;
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}
