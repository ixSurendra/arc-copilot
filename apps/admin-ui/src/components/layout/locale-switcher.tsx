'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Languages } from 'lucide-react';

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggleLocale = () => {
    const newLocale = locale === 'en' ? 'ar' : 'en';
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <Button variant="ghost" size="icon" onClick={toggleLocale}>
      <Languages className="h-4 w-4" />
      <span className="sr-only">
        {locale === 'en' ? 'العربية' : 'English'}
      </span>
    </Button>
  );
}
