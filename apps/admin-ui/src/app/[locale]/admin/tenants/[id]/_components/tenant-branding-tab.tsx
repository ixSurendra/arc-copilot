'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Loader2, Palette, Type, Paintbrush, Mail,
  Sparkles, Eye, Upload, X, ImageIcon,
  Sun, Moon, LayoutDashboard, Users, FileText, Settings, Bell, Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { clientFetch } from '@/lib/api-client-browser';
import type { TenantBranding } from '@/types';

interface TenantBrandingTabProps {
  tenantId: number;
}

const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

function isValidImageUrl(url: string): boolean {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/* ── Color Picker with presets ───────────────────────────── */
function ColorPicker({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  error?: string;
}) {
  const nativeRef = useRef<HTMLInputElement>(null);
  const resolved = value && HEX_COLOR_REGEX.test(value) ? value : placeholder;

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
      <div className="flex items-center gap-3">
        {/* Clickable color swatch — opens native color picker */}
        <button
          type="button"
          onClick={() => nativeRef.current?.click()}
          className="h-10 w-10 rounded-lg border-2 border-border shrink-0 cursor-pointer transition-all hover:scale-105 hover:shadow-md relative overflow-hidden group"
          style={{ backgroundColor: resolved }}
          title="Click to pick a color"
        >
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        </button>
        {/* Hidden native color input */}
        <input
          ref={nativeRef}
          type="color"
          value={resolved}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="sr-only"
          tabIndex={-1}
        />
        {/* Hex text input */}
        <Input
          id={id}
          placeholder={placeholder}
          className="flex-1 font-mono uppercase rounded-lg"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      {/* Preset colors */}
      <div className="flex items-center gap-1.5 pt-1">
        <span className="text-[10px] text-muted-foreground mr-1">Presets:</span>
        {['#3B82F6', '#22C55E', '#EF4444', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#18181B'].map(
          (c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              className={`h-5 w-5 rounded-full border transition-all hover:scale-125 cursor-pointer ${
                value.toUpperCase() === c ? 'ring-2 ring-offset-2 ring-primary' : 'border-border'
              }`}
              style={{ backgroundColor: c }}
              title={c}
            />
          ),
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/* ── Logo Upload with drag-drop ──────────────────────────── */
function LogoUpload({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  const processFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file (PNG, JPG, SVG, etc.)');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Logo must be under 2MB');
        return;
      }
      setUploading(true);
      const reader = new FileReader();
      reader.onload = () => {
        onChange(reader.result as string);
        setUploading(false);
      };
      reader.onerror = () => {
        toast.error('Failed to read file');
        setUploading(false);
      };
      reader.readAsDataURL(file);
    },
    [onChange],
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>

      {/* Drag & drop zone / upload button */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-4 transition-colors text-center ${
          dragOver
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-muted-foreground/40'
        }`}
      >
        {value && (isValidImageUrl(value) || value.startsWith('data:')) ? (
          /* Preview of current logo */
          <div className="flex items-center gap-4">
            <div className="border rounded-lg p-2 bg-muted/30 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value}
                alt="Logo preview"
                className="max-h-12 max-w-[160px] object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
            <div className="flex-1 text-left">
              <p className="text-xs text-muted-foreground">
                {value.startsWith('data:') ? 'Uploaded file' : 'External URL'}
              </p>
              <p className="text-[10px] text-muted-foreground/60 truncate max-w-[200px]">
                {value.startsWith('data:') ? `${Math.round(value.length * 0.75 / 1024)}KB base64` : value}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange('')}
              className="shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          /* Empty state — upload prompt */
          <div className="py-2">
            <ImageIcon className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {uploading ? 'Processing...' : 'Drop an image here or click to upload'}
            </p>
            <p className="text-[10px] text-muted-foreground/50 mt-1">
              PNG, JPG, SVG — Max 2MB
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5 mr-1.5" />
              )}
              Upload Logo
            </Button>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) processFile(file);
            e.target.value = '';
          }}
        />
      </div>

      {/* OR separator + URL input */}
      <div className="flex items-center gap-3 pt-1">
        <div className="flex-1 h-px bg-border" />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">or enter URL</span>
        <div className="flex-1 h-px bg-border" />
      </div>
      <Input
        placeholder="https://example.com/logo.png"
        className="rounded-lg"
        value={value.startsWith('data:') ? '' : value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/* ── App Theme Preview ──────────────────────────────────── */
function AppThemePreview({
  resolvedPrimary,
  resolvedSecondary,
  companyName,
  logoUrl,
}: {
  resolvedPrimary: string;
  resolvedSecondary: string;
  companyName: string;
  logoUrl: string;
}) {
  const [previewMode, setPreviewMode] = useState<'light' | 'dark'>('light');
  const isDark = previewMode === 'dark';

  // Theme-aware colors
  const bg = isDark ? '#09090b' : '#ffffff';
  const sidebarBg = isDark ? '#18181b' : '#fafafa';
  const contentBg = isDark ? '#09090b' : '#f4f4f5';
  const cardBg = isDark ? '#18181b' : '#ffffff';
  const textPrimary = isDark ? '#fafafa' : '#09090b';
  const textSecondary = isDark ? '#a1a1aa' : '#71717a';
  const textMuted = isDark ? '#52525b' : '#a1a1aa';
  const borderColor = isDark ? '#27272a' : '#e4e4e7';
  const hoverBg = isDark ? '#27272a' : '#f4f4f5';

  const sidebarItems = [
    { icon: LayoutDashboard, label: 'Dashboard', active: true },
    { icon: Users, label: 'Users', active: false },
    { icon: FileText, label: 'Documents', active: false },
    { icon: Bell, label: 'Notifications', active: false },
    { icon: Settings, label: 'Settings', active: false },
  ];

  return (
    <Card className="shadow-sm rounded-xl border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
            <Sparkles className="h-4.5 w-4.5 text-emerald-500" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base">App Theme Preview</CardTitle>
            <CardDescription className="text-xs">
              How your app will look with your branding
            </CardDescription>
          </div>
          {/* Light / Dark toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-border/60 p-0.5">
            <button
              type="button"
              onClick={() => setPreviewMode('light')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${
                !isDark
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sun className="h-3 w-3" /> Light
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode('dark')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${
                isDark
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Moon className="h-3 w-3" /> Dark
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* ── App Mockup ── */}
        <div
          className="rounded-xl overflow-hidden border shadow-sm"
          style={{ borderColor, backgroundColor: bg }}
        >
          {/* ── Gradient Header ── */}
          <div
            className="flex items-center gap-2.5 px-3 py-2"
            style={{
              backgroundImage: `linear-gradient(135deg, ${resolvedPrimary}, ${resolvedSecondary})`,
            }}
          >
            {/* Logo */}
            {logoUrl && (isValidImageUrl(logoUrl) || logoUrl.startsWith('data:')) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="Logo"
                className="h-5 max-w-[60px] object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className="h-5 w-5 rounded bg-white/20" />
            )}
            <span className="text-white font-semibold text-[11px] flex-1 truncate">
              {companyName || 'Company Name'}
            </span>
            {/* Header actions */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 rounded-md bg-white/15 px-2 py-0.5">
                <Search className="h-3 w-3 text-white/70" />
                <span className="text-[9px] text-white/60">Search...</span>
              </div>
              <div className="h-4 w-4 rounded-full bg-white/20 flex items-center justify-center">
                <Bell className="h-2.5 w-2.5 text-white/70" />
              </div>
              <div className="h-5 w-5 rounded-full bg-white/25 flex items-center justify-center">
                <span className="text-[8px] font-bold text-white">JD</span>
              </div>
            </div>
          </div>

          {/* ── Body: Sidebar + Content ── */}
          <div className="flex" style={{ minHeight: 200 }}>
            {/* Sidebar */}
            <div
              className="w-[72px] shrink-0 py-2 px-1.5 space-y-0.5"
              style={{ backgroundColor: sidebarBg, borderRight: `1px solid ${borderColor}` }}
            >
              {sidebarItems.map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 cursor-default transition-colors"
                  style={{
                    backgroundColor: item.active ? `${resolvedPrimary}15` : 'transparent',
                    borderLeft: item.active ? `2px solid ${resolvedPrimary}` : '2px solid transparent',
                  }}
                >
                  <item.icon
                    className="h-3.5 w-3.5"
                    style={{ color: item.active ? resolvedPrimary : textMuted }}
                  />
                  <span
                    className="text-[8px] font-medium"
                    style={{ color: item.active ? resolvedPrimary : textSecondary }}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Main Content */}
            <div className="flex-1 p-3 space-y-2.5" style={{ backgroundColor: contentBg }}>
              {/* Page title */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[11px] font-semibold" style={{ color: textPrimary }}>Dashboard</h3>
                  <p className="text-[8px]" style={{ color: textSecondary }}>Welcome back, John</p>
                </div>
                <button
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-medium text-white"
                  style={{ backgroundColor: resolvedPrimary }}
                >
                  + New
                </button>
              </div>

              {/* Stat cards row */}
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: 'Total Users', value: '1,284' },
                  { label: 'Documents', value: '3,421' },
                  { label: 'Storage', value: '67%' },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-lg p-2 space-y-0.5"
                    style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}` }}
                  >
                    <p className="text-[7px]" style={{ color: textSecondary }}>{stat.label}</p>
                    <p className="text-[11px] font-bold" style={{ color: textPrimary }}>{stat.value}</p>
                    {stat.label === 'Storage' && (
                      <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: hoverBg }}>
                        <div className="h-full rounded-full" style={{ width: '67%', backgroundColor: resolvedPrimary }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Recent activity card */}
              <div
                className="rounded-lg p-2 space-y-1.5"
                style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}` }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-semibold" style={{ color: textPrimary }}>Recent Activity</span>
                  <span className="text-[8px] font-medium" style={{ color: resolvedPrimary }}>View all</span>
                </div>
                {[
                  { name: 'Invoice #1024', status: 'Active', time: '2m ago' },
                  { name: 'User onboarding', status: 'Pending', time: '15m ago' },
                  { name: 'Report Q1-2026', status: 'Complete', time: '1h ago' },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-1"
                    style={{ borderTop: i > 0 ? `1px solid ${borderColor}` : undefined }}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: resolvedPrimary }} />
                      <span className="text-[8px]" style={{ color: textPrimary }}>{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[7px] font-medium px-1.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: item.status === 'Active' ? `${resolvedPrimary}20` : item.status === 'Pending' ? `#F59E0B20` : `#22C55E20`,
                          color: item.status === 'Active' ? resolvedPrimary : item.status === 'Pending' ? '#F59E0B' : '#22C55E',
                        }}
                      >
                        {item.status}
                      </span>
                      <span className="text-[7px]" style={{ color: textMuted }}>{item.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* UI Elements showcase */}
        <div className="mt-3 space-y-2">
          <p className="text-[10px] font-medium text-muted-foreground">Accent Color on UI Elements</p>
          <div className="grid grid-cols-2 gap-2">
            {/* Buttons */}
            <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 space-y-1.5">
              <span className="text-[9px] text-muted-foreground font-medium">Buttons</span>
              <div className="flex items-center gap-1.5">
                <button className="px-2 py-1 rounded-md text-[9px] font-medium text-white" style={{ backgroundColor: resolvedPrimary }}>
                  Primary
                </button>
                <button className="px-2 py-1 rounded-md text-[9px] font-medium border" style={{ color: resolvedPrimary, borderColor: resolvedPrimary }}>
                  Outline
                </button>
                <button className="px-2 py-1 rounded-md text-[9px] font-medium" style={{ color: resolvedPrimary, backgroundColor: `${resolvedPrimary}15` }}>
                  Ghost
                </button>
              </div>
            </div>
            {/* Badges & Links */}
            <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 space-y-1.5">
              <span className="text-[9px] text-muted-foreground font-medium">Badges & Links</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-1.5 py-0.5 rounded-full text-[8px] font-semibold text-white" style={{ backgroundColor: resolvedPrimary }}>Active</span>
                <span className="px-1.5 py-0.5 rounded-full text-[8px] font-semibold" style={{ color: resolvedPrimary, backgroundColor: `${resolvedPrimary}15` }}>Info</span>
                <span className="text-[9px] font-medium underline" style={{ color: resolvedPrimary }}>Link text</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Main Component ──────────────────────────────────────── */
export function TenantBrandingTab({ tenantId }: TenantBrandingTabProps) {
  const t = useTranslations('tenants');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#3B82F6');
  const [secondaryColor, setSecondaryColor] = useState('');
  const [footerText, setFooterText] = useState('');
  const [usePrimaryAsTheme, setUsePrimaryAsTheme] = useState(false);

  const [primaryColorError, setPrimaryColorError] = useState('');

  useEffect(() => {
    async function fetchBranding() {
      try {
        const data = await clientFetch<TenantBranding>(
          `/api/proxy/admin/branding/${tenantId}`,
        );
        setCompanyName(data.companyName || '');
        setLogoUrl(data.logoUrl || '');
        setPrimaryColor(data.primaryColor || '#3B82F6');
        setSecondaryColor(data.secondaryColor || '');
        setFooterText(data.footerText || '');
        setUsePrimaryAsTheme(data.usePrimaryAsTheme ?? false);
      } catch {
        // Branding may not exist yet; start with defaults
      } finally {
        setLoading(false);
      }
    }
    fetchBranding();
  }, [tenantId]);

  function handlePrimaryColorChange(value: string) {
    setPrimaryColor(value);
    if (value && !HEX_COLOR_REGEX.test(value)) {
      setPrimaryColorError('Must be a valid hex color (e.g. #3B82F6)');
    } else {
      setPrimaryColorError('');
    }
  }

  async function handleSave() {
    if (!companyName.trim()) return;
    if (primaryColor && !HEX_COLOR_REGEX.test(primaryColor)) return;

    setSaving(true);
    try {
      await clientFetch(`/api/proxy/admin/branding/${tenantId}`, {
        method: 'PUT',
        body: JSON.stringify({
          companyName: companyName.trim(),
          logoUrl: logoUrl.trim() || null,
          primaryColor: primaryColor || '#3B82F6',
          secondaryColor: secondaryColor.trim() || null,
          footerText: footerText.trim() || null,
          usePrimaryAsTheme,
        }),
      });
      toast.success(t('brandingSaved'));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('brandingError'),
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3 space-y-5">
          <Skeleton className="h-[200px] w-full rounded-xl" />
          <Skeleton className="h-[160px] w-full rounded-xl" />
          <Skeleton className="h-[120px] w-full rounded-xl" />
        </div>
        <div className="xl:col-span-2">
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const resolvedPrimary =
    primaryColor && HEX_COLOR_REGEX.test(primaryColor)
      ? primaryColor
      : '#3B82F6';
  const resolvedSecondary =
    secondaryColor && HEX_COLOR_REGEX.test(secondaryColor)
      ? secondaryColor
      : '#1E40AF';

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
      {/* ─── Left: Branding Form (3/5 width) ─── */}
      <div className="xl:col-span-3 space-y-5">
        {/* Section 1: Identity */}
        <Card className="shadow-sm rounded-xl border-border/60">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Type className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Company Identity</CardTitle>
                <CardDescription className="text-xs">
                  Set the company name and logo displayed across the app
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Company Name */}
            <div className="space-y-2">
              <Label htmlFor="companyName" className="text-sm font-medium">
                {t('companyName')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="companyName"
                placeholder={t('companyName')}
                className="rounded-lg"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>

            {/* Logo — Upload or URL */}
            <LogoUpload
              label={t('logoUrl')}
              value={logoUrl}
              onChange={setLogoUrl}
            />
          </CardContent>
        </Card>

        {/* Section 2: Colors */}
        <Card className="shadow-sm rounded-xl border-border/60">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10">
                <Palette className="h-4.5 w-4.5 text-violet-500" />
              </div>
              <div>
                <CardTitle className="text-base">Brand Colors</CardTitle>
                <CardDescription className="text-xs">
                  Define the primary and secondary colors for emails and UI
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <ColorPicker
                id="primaryColor"
                label={t('primaryColor')}
                value={primaryColor}
                onChange={handlePrimaryColorChange}
                placeholder="#3B82F6"
                error={primaryColorError}
              />
              <ColorPicker
                id="secondaryColor"
                label={t('secondaryColor')}
                value={secondaryColor}
                onChange={setSecondaryColor}
                placeholder="#1E40AF"
              />
            </div>

            {/* Color preview strip */}
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 p-3">
              <div className="flex-1 h-8 rounded-md" style={{ backgroundColor: resolvedPrimary }} />
              <div className="flex-1 h-8 rounded-md" style={{ backgroundColor: resolvedSecondary }} />
              <div className="flex-1 h-8 rounded-md" style={{ backgroundImage: `linear-gradient(to right, ${resolvedPrimary}, ${resolvedSecondary})` }} />
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Footer & Theme */}
        <Card className="shadow-sm rounded-xl border-border/60">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
                <Paintbrush className="h-4.5 w-4.5 text-amber-500" />
              </div>
              <div>
                <CardTitle className="text-base">Theme & Footer</CardTitle>
                <CardDescription className="text-xs">
                  Configure email footer text and application theme options
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Footer Text */}
            <div className="space-y-2">
              <Label htmlFor="footerText" className="text-sm font-medium">
                {t('footerText')}
              </Label>
              <Textarea
                id="footerText"
                placeholder={t('footerText')}
                className="rounded-lg resize-none"
                rows={3}
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
              />
            </div>

            {/* Use Primary as App Theme */}
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/30 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <Label htmlFor="usePrimaryAsTheme" className="text-sm font-medium cursor-pointer">
                    Use primary color as app theme
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    When enabled, the primary color will be used as the accent
                    theme color across the application.
                  </p>
                </div>
              </div>
              <Switch
                id="usePrimaryAsTheme"
                checked={usePrimaryAsTheme}
                onCheckedChange={setUsePrimaryAsTheme}
              />
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-3 pt-1">
              <Button
                onClick={handleSave}
                disabled={saving || !companyName.trim() || !!primaryColorError}
                className="rounded-lg"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {t('saveBranding')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Right: Live Preview (2/5 width) ─── */}
      <div className="xl:col-span-2 space-y-5">
        {/* Email Preview */}
        <Card className="shadow-sm rounded-xl border-border/60">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                <Mail className="h-4.5 w-4.5 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base">{t('brandingPreview')}</CardTitle>
                <CardDescription className="text-xs">Live email template preview</CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px] shrink-0">
                <Eye className="h-3 w-3 mr-1" /> Live
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border border-border/60 rounded-xl overflow-hidden shadow-sm bg-white">
              {/* Email Header */}
              <div
                className="px-5 py-4 flex items-center gap-3"
                style={{ backgroundColor: resolvedPrimary }}
              >
                {logoUrl && (isValidImageUrl(logoUrl) || logoUrl.startsWith('data:')) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="h-7 max-w-[100px] object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="h-7 w-7 rounded bg-white/20" />
                )}
                <span className="text-white font-semibold text-sm">
                  {companyName || 'Company Name'}
                </span>
              </div>

              {/* Email Body */}
              <div className="px-5 py-5 space-y-3">
                <p className="text-sm font-medium text-gray-900">
                  Welcome to {companyName || 'Company Name'}!
                </p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Your account has been successfully created. You can now
                  access all features available under your plan.
                </p>
                <div className="pt-1">
                  <span
                    className="inline-block px-4 py-2 rounded-lg text-xs font-medium text-white"
                    style={{ backgroundColor: resolvedPrimary }}
                  >
                    Get Started
                  </span>
                </div>
              </div>

              {/* Email Footer */}
              <div
                className="px-5 py-3 text-[11px]"
                style={{
                  backgroundColor: resolvedSecondary,
                  color: 'rgba(255, 255, 255, 0.85)',
                }}
              >
                {footerText || `\u00A9 ${new Date().getFullYear()} ${companyName || 'Company Name'}. All rights reserved.`}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* App Theme Preview */}
        {usePrimaryAsTheme && (
          <AppThemePreview
            resolvedPrimary={resolvedPrimary}
            resolvedSecondary={resolvedSecondary}
            companyName={companyName}
            logoUrl={logoUrl}
          />
        )}
      </div>
    </div>
  );
}
