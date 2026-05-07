/**
 * Custom event for license expiration detection.
 * Fired by API clients (clientFetch, use-api fetcher) when a 403 response
 * with licenseExpired: true is received. The LicenseExpiredProvider listens
 * for this event and shows the blocking overlay.
 */

export const LICENSE_EXPIRED_EVENT = 'license:expired';

export interface LicenseExpiredDetail {
  message?: string;
  expiresAt?: string;
  licenseStatus?: string;
}

export function dispatchLicenseExpired(detail: LicenseExpiredDetail): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<LicenseExpiredDetail>(LICENSE_EXPIRED_EVENT, { detail }),
  );
}

/**
 * Check a fetch Response for a license-expired 403 and dispatch the event.
 * Returns true if the response indicates license expiration.
 */
export async function checkLicenseExpiredResponse(
  res: Response,
): Promise<boolean> {
  if (res.status !== 403) return false;

  try {
    const cloned = res.clone();
    const body = await cloned.json();
    if (body?.licenseExpired === true) {
      dispatchLicenseExpired({
        message: body.message,
        expiresAt: body.expiresAt,
        licenseStatus: body.licenseStatus,
      });
      return true;
    }
  } catch {
    // Not JSON or doesn't match — not a license error
  }

  return false;
}
