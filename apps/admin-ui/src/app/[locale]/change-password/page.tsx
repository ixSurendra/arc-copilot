'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { LocaleSwitcher } from '@/components/layout/locale-switcher';
import { toast } from 'sonner';
import {
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Shield,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export default function ChangePasswordPage() {
  const t = useTranslations('auth');
  const ct = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onSubmit = async (data: ChangePasswordValues) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
        credentials: 'include',
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        toast.error(error.message || t('passwordChangeError'));
        return;
      }

      // Clear session so user re-authenticates with new password
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      }).catch(() => {});

      setSuccess(true);
    } catch {
      toast.error(t('passwordChangeError'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLogin = () => {
    router.push(`/${locale}/login`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-[length:24px_24px] bg-background dark:bg-[radial-gradient(hsl(var(--primary)/0.15)_0.5px,transparent_0.5px)]">
      {/* Top bar */}
      <div className="absolute top-6 start-6 end-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold">{ct('appName')}</span>
        </div>
        <div className="flex items-center gap-1">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </div>

      <div className="w-full max-w-[480px] bg-card rounded-xl shadow-2xl overflow-hidden border">
        {/* Header section */}
        <div className="relative h-48 w-full bg-muted overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
                <Shield className="h-8 w-8 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold">{ct('appName')}</h1>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card to-transparent" />
        </div>

        {/* Content */}
        <div className="px-8 pb-10 pt-2">
          {success ? (
            /* Success state */
            <div className="text-center space-y-4 py-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-xl font-semibold">
                {t('passwordChanged')}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t('passwordChangedDescription')}
              </p>
              <Button
                onClick={handleGoToLogin}
                className="w-full mt-4 gap-2"
              >
                {t('backToLogin')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            /* Form state */
            <>
              <div className="mb-8 text-center">
                <h2 className="text-xl font-semibold">
                  {t('changePasswordTitle')}
                </h2>
                <p className="text-muted-foreground mt-2 text-sm">
                  {t('changePasswordDescription')}
                </p>
              </div>

              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-5"
              >
                {/* Current Password */}
                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="text-sm font-medium flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    {t('currentPassword')}
                  </Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrent ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="pe-9"
                      {...register('currentPassword')}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showCurrent ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.currentPassword && (
                    <p className="text-sm text-destructive">
                      {errors.currentPassword.message}
                    </p>
                  )}
                </div>

                {/* New Password */}
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-sm font-medium flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    {t('newPassword')}
                  </Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNew ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="pe-9"
                      {...register('newPassword')}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowNew(!showNew)}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showNew ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.newPassword && (
                    <p className="text-sm text-destructive">
                      {errors.newPassword.message}
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    {t('confirmPassword')}
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="pe-9"
                      {...register('confirmPassword')}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirm ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full shadow-lg shadow-primary/20 py-3 gap-2"
                  disabled={loading}
                >
                  {loading ? ct('loading') : t('changePassword')}
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </Button>
              </form>

              {/* Back link */}
              <div className="mt-6 text-center">
                <Link
                  href="/admin/dashboard"
                  className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="mr-1 h-3 w-3" />
                  {t('backToDashboard')}
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Security badge */}
        <div className="bg-muted/50 py-3 px-8 flex justify-center items-center gap-2">
          <Shield className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
            Secure Enterprise Environment
          </span>
        </div>
      </div>
    </div>
  );
}
