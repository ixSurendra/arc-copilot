'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Search, ShoppingCart, Gauge } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { useApi } from '@/hooks/use-api';
import { clientFetch } from '@/lib/api-client-browser';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type {
  PaginatedResponse,
  Tenant,
  FeatureRegistry,
  TopUpPricing,
  QuotaCheckResult,
} from '@/types';

/* -------------------------------------------------------------------------- */
/*  Extended TopUpPricing with feature name                                   */
/* -------------------------------------------------------------------------- */

interface TopUpPricingWithFeature extends TopUpPricing {
  feature?: { featureName: string };
}

/* -------------------------------------------------------------------------- */
/*  Main page component                                                       */
/* -------------------------------------------------------------------------- */

export default function QuotaPage() {
  const t = useTranslations('quota');
  const tc = useTranslations('common');

  /* ---- Check Quota state ---- */
  const [checkTenantId, setCheckTenantId] = useState('');
  const [checkFeatureKey, setCheckFeatureKey] = useState('');
  const [checking, setChecking] = useState(false);
  const [quotaResult, setQuotaResult] = useState<QuotaCheckResult | null>(null);

  /* ---- Purchase Top-Up state ---- */
  const [purchaseTenantId, setPurchaseTenantId] = useState('');
  const [purchaseFeatureId, setPurchaseFeatureId] = useState('');
  const [topUpPricingId, setTopUpPricingId] = useState('');
  const [purchasing, setPurchasing] = useState(false);

  /* ---- Data fetching ---- */
  const { data: tenantsData } = useApi<PaginatedResponse<Tenant>>(
    '/api/proxy/admin/tenants?limit=100',
  );

  const { data: featuresData } = useApi<PaginatedResponse<FeatureRegistry>>(
    '/api/proxy/admin/features?limit=100',
  );

  const { data: topUpPricingsData } = useApi<PaginatedResponse<TopUpPricingWithFeature>>(
    '/api/proxy/admin/pricing/top-up?limit=100',
  );

  const tenants = tenantsData?.data ?? [];
  const features = featuresData?.data ?? [];
  const topUpPricings = topUpPricingsData?.data ?? [];

  /* ---- Check Quota handler ---- */
  const handleCheckQuota = async () => {
    if (!checkTenantId || !checkFeatureKey) return;
    setChecking(true);
    setQuotaResult(null);
    try {
      const data = await clientFetch<QuotaCheckResult>(
        `/api/proxy/admin/quota/check?tenantId=${checkTenantId}&featureKey=${checkFeatureKey}`,
      );
      setQuotaResult(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to check quota');
    } finally {
      setChecking(false);
    }
  };

  /* ---- Purchase Top-Up handler ---- */
  const handlePurchase = async () => {
    if (!purchaseTenantId || !purchaseFeatureId || !topUpPricingId) return;
    setPurchasing(true);
    try {
      await clientFetch('/api/proxy/admin/quota/top-up', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: purchaseTenantId,
          featureId: purchaseFeatureId,
          topUpPricingId,
        }),
      });
      toast.success('Top-up purchased successfully');
      setPurchaseTenantId('');
      setPurchaseFeatureId('');
      setTopUpPricingId('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to purchase top-up');
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={t('title')} description={t('pageDescription')} icon={Gauge} />

      {/* Check Quota Section */}
      <Card className="shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5" />
            {t('checkQuota')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Tenant Select */}
            <div className="space-y-2">
              <Label>Tenant</Label>
              <Select value={checkTenantId} onValueChange={setCheckTenantId}>
                <SelectTrigger className="rounded-md">
                  <SelectValue placeholder="Select tenant" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={String(tenant.id)}>
                      {tenant.tenantName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Feature Select */}
            <div className="space-y-2">
              <Label>Feature</Label>
              <Select value={checkFeatureKey} onValueChange={setCheckFeatureKey}>
                <SelectTrigger className="rounded-md">
                  <SelectValue placeholder="Select feature" />
                </SelectTrigger>
                <SelectContent>
                  {features.map((feature) => (
                    <SelectItem key={feature.id} value={feature.featureKey}>
                      {feature.featureName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleCheckQuota}
            disabled={checking || !checkTenantId || !checkFeatureKey}
          >
            {checking && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('checkQuota')}
          </Button>

          {/* Quota Result */}
          {quotaResult && (
            <Card className="mt-4 border">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{tc('status')}</p>
                    <Badge variant={quotaResult.allowed ? 'default' : 'destructive'}>
                      {quotaResult.allowed ? t('allowed') : t('denied')}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t('consumed')}</p>
                    <p className="text-sm font-medium">{quotaResult.consumed}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t('limit')}</p>
                    <p className="text-sm font-medium">
                      {quotaResult.limit !== null ? quotaResult.limit : 'Unlimited'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t('remaining')}</p>
                    <p className="text-sm font-medium">
                      {quotaResult.remaining !== null ? quotaResult.remaining : 'Unlimited'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t('source')}</p>
                    <p className="text-sm font-medium capitalize">{quotaResult.source}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Purchase Top-Up Section */}
      <Card className="shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            {t('purchaseTopUp')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Tenant Select */}
            <div className="space-y-2">
              <Label>Tenant</Label>
              <Select value={purchaseTenantId} onValueChange={setPurchaseTenantId}>
                <SelectTrigger className="rounded-md">
                  <SelectValue placeholder="Select tenant" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={String(tenant.id)}>
                      {tenant.tenantName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Feature Select */}
            <div className="space-y-2">
              <Label>Feature</Label>
              <Select value={purchaseFeatureId} onValueChange={setPurchaseFeatureId}>
                <SelectTrigger className="rounded-md">
                  <SelectValue placeholder="Select feature" />
                </SelectTrigger>
                <SelectContent>
                  {features.map((feature) => (
                    <SelectItem key={feature.id} value={String(feature.id)}>
                      {feature.featureName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Top-Up Pricing Select */}
            <div className="space-y-2">
              <Label>Top-Up Package</Label>
              <Select value={topUpPricingId} onValueChange={setTopUpPricingId}>
                <SelectTrigger className="rounded-md">
                  <SelectValue placeholder="Select package" />
                </SelectTrigger>
                <SelectContent>
                  {topUpPricings.map((tp) => (
                    <SelectItem key={tp.id} value={String(tp.id)}>
                      {tp.feature?.featureName ?? tp.featureId} - {tp.quotaAmount} units ({tp.currency} {tp.price})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handlePurchase}
            disabled={purchasing || !purchaseTenantId || !purchaseFeatureId || !topUpPricingId}
          >
            {purchasing && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('purchaseTopUp')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
