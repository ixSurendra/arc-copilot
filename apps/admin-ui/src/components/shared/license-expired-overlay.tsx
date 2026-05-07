'use client';

import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { ShieldOff, LogOut } from 'lucide-react';
import { useLicenseExpired } from '@/contexts/license-expired-context';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';

export function LicenseExpiredOverlay() {
  const t = useTranslations('licenseExpired');
  const { isExpired, message, expiresAt } = useLicenseExpired();
  const router = useRouter();
  const locale = useLocale();

  if (!isExpired) return null;

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // Ignore errors during logout
    }
    router.push(`/${locale}/login`);
    router.refresh();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="mx-4 w-full max-w-md text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <ShieldOff className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-xl">{t('title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {message || t('description')}
          </p>
          {expiresAt && (
            <div className="rounded-lg border bg-muted/50 px-4 py-3">
              <p className="text-xs text-muted-foreground">{t('expiredOn')}</p>
              <p className="text-sm font-medium">{formatDate(expiresAt)}</p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {t('contactAdmin')}
          </p>
        </CardContent>
        <CardFooter className="justify-center pb-6">
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="me-2 h-4 w-4" />
            {t('logout')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
