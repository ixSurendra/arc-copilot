import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  const t = useTranslations('errors');

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
        <h2 className="mt-4 text-2xl font-semibold">{t('notFound')}</h2>
        <p className="mt-2 text-muted-foreground">{t('notFoundDescription')}</p>
        <Button asChild className="mt-6">
          <Link href="/admin/dashboard">{t('goHome')}</Link>
        </Button>
      </div>
    </div>
  );
}
