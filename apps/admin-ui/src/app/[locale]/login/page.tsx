'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormValues } from '@/lib/schemas/login.schema';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { LocaleSwitcher } from '@/components/layout/locale-switcher';
import { toast } from 'sonner';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Globe,
  LayoutDashboard,
  Users,
  Shield,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react';

/* ── Feature slide data ─────────────────────────────────────────────── */
interface FeatureSlide {
  icon: LucideIcon;
  title: string;
  desc: string;
  content: React.ReactNode;
}

function DashboardContent() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2.5">
        {[
          { label: 'Total Users', value: '2,847', pct: '78%', color: 'bg-[hsl(175,70%,40%)]' },
          { label: 'Active Now', value: '184', pct: '65%', color: 'bg-blue-500' },
          { label: 'New Today', value: '32', pct: '45%', color: 'bg-violet-500' },
        ].map((s) => (
          <div key={s.label} className="rounded-lg bg-white/[0.06] border border-white/[0.06] p-3">
            <p className="text-[10px] text-white/40 uppercase tracking-wider">{s.label}</p>
            <p className="text-lg font-bold text-white mt-0.5">{s.value}</p>
            <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
              <div className={`h-full rounded-full ${s.color}`} style={{ width: s.pct }} />
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-medium text-white/50 uppercase tracking-wider">Monthly Activity</span>
          <span className="text-[10px] text-[hsl(175,70%,60%)] font-medium">+12.5%</span>
        </div>
        <div className="flex items-end gap-1.5 h-14">
          {[35, 45, 30, 55, 65, 50, 70, 80, 60, 75, 85, 90].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm bg-gradient-to-t from-[hsl(175,70%,35%)] to-[hsl(175,70%,50%)]"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function UsersContent() {
  return (
    <div className="space-y-2">
      {[
        { name: 'Sarah Chen', role: 'Admin', status: 'Active' },
        { name: 'Marcus Johnson', role: 'Editor', status: 'Active' },
        { name: 'Aisha Patel', role: 'Viewer', status: 'Inactive' },
        { name: 'David Kim', role: 'Admin', status: 'Active' },
        { name: 'Elena Rodriguez', role: 'Editor', status: 'Active' },
      ].map((u) => (
        <div key={u.name} className="flex items-center justify-between rounded-lg bg-white/[0.06] border border-white/[0.06] px-3 py-2.5">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-[hsl(175,70%,40%)]/20 flex items-center justify-center text-xs font-semibold text-[hsl(175,70%,60%)]">
              {u.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <p className="text-sm font-medium text-white">{u.name}</p>
              <p className="text-[10px] text-white/40">{u.role}</p>
            </div>
          </div>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
            u.status === 'Active' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/10 text-white/40'
          }`}>
            {u.status}
          </span>
        </div>
      ))}
    </div>
  );
}

function RBACContent() {
  return (
    <div className="space-y-3">
      {[
        { role: 'Super Admin', perms: ['Full Access', 'System Config', 'User Mgmt'], color: 'bg-red-500' },
        { role: 'Tenant Admin', perms: ['Tenant Config', 'User Mgmt', 'Reports'], color: 'bg-orange-500' },
        { role: 'Editor', perms: ['Content Edit', 'View Reports'], color: 'bg-blue-500' },
        { role: 'Viewer', perms: ['Read Only'], color: 'bg-slate-500' },
      ].map((r) => (
        <div key={r.role} className="rounded-lg bg-white/[0.06] border border-white/[0.06] px-3 py-2.5">
          <div className="flex items-center gap-2 mb-2">
            <div className={`h-2 w-2 rounded-full ${r.color}`} />
            <p className="text-sm font-medium text-white">{r.role}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {r.perms.map((p) => (
              <span key={p} className="text-[10px] bg-white/[0.08] border border-white/[0.08] text-white/50 rounded-md px-2 py-0.5">
                {p}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function AnalyticsContent() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2.5">
        {[
          { label: 'Page Views', value: '12.4K', change: '+8.2%' },
          { label: 'Sessions', value: '3,291', change: '+5.1%' },
          { label: 'Bounce Rate', value: '24.3%', change: '-2.4%' },
          { label: 'Avg Duration', value: '4m 12s', change: '+12%' },
        ].map((m) => (
          <div key={m.label} className="rounded-lg bg-white/[0.06] border border-white/[0.06] p-3">
            <p className="text-[10px] text-white/40 uppercase tracking-wider">{m.label}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-base font-bold text-white">{m.value}</p>
              <span className={`text-[10px] font-medium ${m.change.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>
                {m.change}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-3">
        <span className="text-[10px] font-medium text-white/50 uppercase tracking-wider">Traffic Trend</span>
        <div className="flex items-end gap-1 h-12 mt-2">
          {[40, 55, 45, 60, 50, 75, 65, 80, 70, 85, 78, 92].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm bg-gradient-to-t from-violet-500/60 to-violet-500"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────── */
export default function LoginPage() {
  const t = useTranslations('auth');
  const ct = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const callbackUrl = searchParams.get('callbackUrl') || `/${locale}/admin/dashboard`;

  // Show session expiry message if redirected from expired session
  const reason = searchParams.get('reason');
  useEffect(() => {
    if (reason === 'session_expired') {
      toast.error('Your session has expired. Please sign in again.');
    }
  }, [reason]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const slides: FeatureSlide[] = [
    {
      icon: LayoutDashboard,
      title: 'Dashboard',
      desc: 'Real-time overview of all activity',
      content: <DashboardContent />,
    },
    {
      icon: Users,
      title: 'User Management',
      desc: 'Roles & permissions at scale',
      content: <UsersContent />,
    },
    {
      icon: Shield,
      title: 'Access Control',
      desc: 'Multi-tenant RBAC',
      content: <RBACContent />,
    },
    {
      icon: BarChart3,
      title: 'Analytics',
      desc: 'Insights & reports',
      content: <AnalyticsContent />,
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setActiveSlide((prev) => (prev + 1) % slides.length);
        setIsTransitioning(false);
      }, 600);
    }, 6000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        toast.error(error.message || t('loginError'));
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      toast.error(t('loginError'));
    } finally {
      setLoading(false);
    }
  };

  const current = slides[activeSlide];
  const Icon = current.icon;

  return (
    <div className="flex min-h-screen">
      {/* Left — Login Form */}
      <div className="relative flex w-full flex-col justify-center px-6 py-12 lg:w-[55%] lg:px-20 xl:px-28">
        {/* Top bar */}
        <div className="absolute top-6 start-6 end-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/20">
              <LayoutDashboard className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-bold tracking-tight">{ct('appName')}</span>
          </div>
          <div className="flex items-center gap-1">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="mb-10">
            <h1 className="text-3xl font-bold tracking-tight">{t('welcomeBack')}</h1>
            <p className="mt-3 text-sm text-muted-foreground">{t('welcomeSubtitle')}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('email')}
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  className="h-12 ps-11 bg-muted/30 border-border/60 rounded-xl transition-colors focus:bg-background focus:border-primary/50"
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t('password')}
                </Label>
                <Link href="/forgot-password" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                  {t('forgotPassword')}
                </Link>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="h-12 ps-11 pe-11 bg-muted/30 border-border/60 rounded-xl transition-colors focus:bg-background focus:border-primary/50"
                  {...register('password')}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="domain" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('domain')}
              </Label>
              <div className="relative">
                <Globe className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="domain"
                  type="text"
                  placeholder="company.com"
                  className="h-12 ps-11 bg-muted/30 border-border/60 rounded-xl transition-colors focus:bg-background focus:border-primary/50"
                  {...register('domain')}
                />
              </div>
            </div>

            <Button type="submit" className="h-12 w-full rounded-xl font-medium text-sm gap-2 group" disabled={loading}>
              {loading ? ct('loading') : (
                <>
                  {t('loginButton')}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              Multi-tenant ready
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              SOC 2 Compliant
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              24/7 Support
            </span>
          </div>
        </div>
      </div>

      {/* Divider line */}
      <div className="hidden lg:block w-px bg-border/40" />

      {/* Right — Branding + Rotating Feature Cards (hidden on mobile) */}
      <div className="dark relative hidden overflow-hidden lg:flex lg:w-[45%] lg:flex-col lg:items-center lg:justify-center lg:p-10 xl:p-14">
        {/* Solid dark background */}
        <div className="absolute inset-0 bg-[#0a0e13]" />

        {/* Radial glow orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 right-0 h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,hsl(170,60%,42%)_0%,transparent_60%)] opacity-30 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full bg-[radial-gradient(circle,hsl(175,55%,35%)_0%,transparent_60%)] opacity-25 blur-3xl" />
        </div>

        {/* Dot pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>

        <div className="relative z-10 w-full max-w-md flex flex-col items-center">
          {/* Rotating card with glow */}
          <div className="relative w-full mb-8">
            {/* Glow behind card */}
            <div className="absolute -inset-4 rounded-3xl bg-[hsl(175,70%,40%)]/15 blur-2xl" />

            {/* Card header — rotating */}
            <div
              className={`relative flex items-center gap-3 mb-4 transition-all duration-500 ease-in-out ${
                isTransitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[hsl(175,70%,60%)]">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{current.title}</h3>
                <p className="text-xs text-white/50">{current.desc}</p>
              </div>
            </div>

            {/* Card body — rotating content */}
            <div
              className={`relative rounded-2xl border border-white/[0.1] bg-white/[0.07] backdrop-blur-md p-5 shadow-2xl transition-all duration-500 ease-in-out ${
                isTransitioning ? 'opacity-0 translate-y-3' : 'opacity-100 translate-y-0'
              }`}
            >
              {current.content}
            </div>

            {/* Slide indicators */}
            <div className="relative mt-5 flex items-center justify-center gap-2">
              {slides.map((slide, i) => (
                <button
                  key={slide.title}
                  onClick={() => {
                    setIsTransitioning(true);
                    setTimeout(() => {
                      setActiveSlide(i);
                      setIsTransitioning(false);
                    }, 600);
                  }}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === activeSlide ? 'w-6 bg-[hsl(175,70%,50%)]' : 'w-1.5 bg-white/20 hover:bg-white/40'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Static tagline — always visible */}
          <h2 className="text-center text-2xl font-bold leading-tight text-white xl:text-3xl">
            {t('brandHeading')}
          </h2>
          <p className="mt-3 max-w-xs text-center text-sm leading-relaxed text-white/55">
            {t('brandSubheading')}
          </p>

          {/* Static stats — always visible */}
          <div className="mt-6 flex items-center gap-6">
            {[
              { value: '99.9%', label: 'Uptime' },
              { value: 'SOC 2', label: 'Compliant' },
              { value: '24/7', label: 'Support' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-sm font-bold text-white">{stat.value}</p>
                <p className="text-[10px] font-medium uppercase tracking-wider text-white/35">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
