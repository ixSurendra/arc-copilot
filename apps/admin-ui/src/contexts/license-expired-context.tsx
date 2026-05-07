'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  LICENSE_EXPIRED_EVENT,
  type LicenseExpiredDetail,
  dispatchLicenseExpired,
} from '@/lib/license-expired-event';

interface LicenseExpiredState {
  isExpired: boolean;
  message?: string;
  expiresAt?: string;
  licenseStatus?: string;
}

interface LicenseExpiredContextValue extends LicenseExpiredState {
  setLicenseExpired: (info: Omit<LicenseExpiredState, 'isExpired'>) => void;
}

const LicenseExpiredContext = createContext<LicenseExpiredContextValue | null>(null);

/**
 * Auth-related paths that should NOT trigger the license expired overlay.
 * These endpoints work regardless of license status.
 */
const AUTH_PATH_PREFIXES = ['/api/auth/'];

export function LicenseExpiredProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LicenseExpiredState>({ isExpired: false });
  const interceptorInstalled = useRef(false);

  const setLicenseExpired = useCallback(
    (info: Omit<LicenseExpiredState, 'isExpired'>) => {
      setState({ isExpired: true, ...info });
    },
    [],
  );

  // Listen for the custom LICENSE_EXPIRED_EVENT dispatched by API clients
  useEffect(() => {
    function handleLicenseExpired(event: Event) {
      const detail = (event as CustomEvent<LicenseExpiredDetail>).detail;
      setLicenseExpired({
        message: detail.message,
        expiresAt: detail.expiresAt,
        licenseStatus: detail.licenseStatus,
      });
    }

    window.addEventListener(LICENSE_EXPIRED_EVENT, handleLicenseExpired);
    return () => {
      window.removeEventListener(LICENSE_EXPIRED_EVENT, handleLicenseExpired);
    };
  }, [setLicenseExpired]);

  // Install a global fetch interceptor to catch 403 LICENSE_EXPIRED from all
  // API calls, including raw fetch() calls that don't go through clientFetch.
  useEffect(() => {
    if (interceptorInstalled.current) return;
    interceptorInstalled.current = true;

    const originalFetch = window.fetch;

    window.fetch = async function (...args: Parameters<typeof fetch>) {
      const res = await originalFetch.apply(this, args);

      // Only check proxy API calls; skip auth endpoints
      const input = args[0];
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : input instanceof Request
              ? input.url
              : String(input ?? '');
      const isAuthPath = AUTH_PATH_PREFIXES.some((prefix) => url.includes(prefix));

      if (res.status === 403 && !isAuthPath) {
        try {
          const cloned = res.clone();
          const body = await cloned.json();
          if (body?.licenseExpired === true) {
            dispatchLicenseExpired({
              message: body.message,
              expiresAt: body.expiresAt,
              licenseStatus: body.licenseStatus,
            });
          }
        } catch {
          // Not JSON or doesn't match — not a license error
        }
      }

      return res;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return (
    <LicenseExpiredContext.Provider value={{ ...state, setLicenseExpired }}>
      {children}
    </LicenseExpiredContext.Provider>
  );
}

export function useLicenseExpired(): LicenseExpiredContextValue {
  const ctx = useContext(LicenseExpiredContext);
  if (!ctx) {
    throw new Error('useLicenseExpired must be used within LicenseExpiredProvider');
  }
  return ctx;
}
