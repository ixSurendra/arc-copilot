'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('errors');

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-semibold">{t('somethingWrong')}</h2>
        {process.env.NODE_ENV === 'development' && (
          <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        )}
        <Button onClick={reset} className="mt-4">
          {t('tryAgain')}
        </Button>
      </div>
    </div>
  );
}
