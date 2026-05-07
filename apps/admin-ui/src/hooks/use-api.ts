import useSWR, { SWRConfiguration } from 'swr';
import { checkLicenseExpiredResponse } from '@/lib/license-expired-event';

/**
 * Single refresh promise — ensures only ONE refresh request is in-flight at a time.
 * Prevents race conditions with refresh token rotation (token revoked after first use).
 * Multiple concurrent 401s will all wait for the same refresh call.
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

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });

  if (res.status === 401) {
    const refreshed = await doRefresh();
    if (refreshed) {
      const retryRes = await fetch(url, { credentials: 'include' });
      if (retryRes.ok) return retryRes.json();
    }
    const locale = window.location.pathname.split('/')[1] || 'en';
    window.location.href = `/${locale}/login?reason=session_expired`;
    throw new Error('Session expired');
  }

  // Check for license expiration before general error handling
  if (res.status === 403) {
    const isLicenseExpired = await checkLicenseExpiredResponse(res);
    if (isLicenseExpired) {
      throw new Error('License expired');
    }
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || 'Request failed');
  }

  return res.json();
}

export function useApi<T>(path: string | null, config?: SWRConfiguration<T>) {
  return useSWR<T>(path, fetcher, {
    revalidateOnFocus: false,
    ...config,
  });
}
