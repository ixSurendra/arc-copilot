import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { routing } from '@/i18n/routing';
import { Inter } from 'next/font/google';
import { LicenseExpiredProvider } from '@/contexts/license-expired-context';
import { LicenseExpiredOverlay } from '@/components/shared/license-expired-overlay';

const inter = Inter({ subsets: ['latin'] });

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <NextIntlClientProvider messages={messages}>
            <LicenseExpiredProvider>
              {children}
              <LicenseExpiredOverlay />
            </LicenseExpiredProvider>
            <Toaster position={locale === 'ar' ? 'bottom-left' : 'bottom-right'} />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
