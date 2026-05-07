'use client';

import { notFound } from 'next/navigation';
import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { isCloudFeaturesEnabled } from '@/lib/feature-flags';
import { Plus, ChevronLeft, ChevronRight, Loader2, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/hooks/use-api';
import { clientFetch } from '@/lib/api-client-browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/shared/page-header';
import { formatDate } from '@/lib/utils';
import type {
  PaginatedResponse,
  PlanPricing,
  TopUpPricing,
  Plan,
  FeatureRegistry,
} from '@/types';

/* -------------------------------------------------------------------------- */
/*  Plan Pricing with joined plan name                                        */
/* -------------------------------------------------------------------------- */

interface PlanPricingWithPlan extends PlanPricing {
  plan?: { planName: string };
}

interface TopUpPricingWithFeature extends TopUpPricing {
  feature?: { featureName: string };
}

/* -------------------------------------------------------------------------- */
/*  Status badge helper                                                       */
/* -------------------------------------------------------------------------- */

const STATUS_VARIANT_MAP: Record<string, 'default' | 'secondary' | 'destructive'> = {
  ACTIVE: 'default',
  INACTIVE: 'secondary',
};

/* -------------------------------------------------------------------------- */
/*  Main page component                                                       */
/* -------------------------------------------------------------------------- */

export default function PricingPage() {
  // Cloud-only surface — gated off in arc-copilot's on-prem build.
  if (!isCloudFeaturesEnabled()) notFound();

  const t = useTranslations('pricing');
  const tc = useTranslations('common');

  /* ---- Plan Pricing state ---- */
  const [planPage, setPlanPage] = useState(1);
  const [planLimit, setPlanLimit] = useState(10);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);

  /* ---- Top-Up Pricing state ---- */
  const [topUpPage, setTopUpPage] = useState(1);
  const [topUpLimit, setTopUpLimit] = useState(10);
  const [topUpDialogOpen, setTopUpDialogOpen] = useState(false);

  /* ---- Data fetching ---- */
  const {
    data: planPricingData,
    mutate: mutatePlanPricing,
  } = useApi<PaginatedResponse<PlanPricingWithPlan>>(
    `/api/proxy/admin/pricing/plan?page=${planPage}&limit=${planLimit}`,
  );

  const {
    data: topUpPricingData,
    mutate: mutateTopUpPricing,
  } = useApi<PaginatedResponse<TopUpPricingWithFeature>>(
    `/api/proxy/admin/pricing/top-up?page=${topUpPage}&limit=${topUpLimit}`,
  );

  const { data: plansData } = useApi<PaginatedResponse<Plan>>(
    '/api/proxy/admin/plans?limit=100',
  );

  const { data: featuresData } = useApi<PaginatedResponse<FeatureRegistry>>(
    '/api/proxy/admin/features?limit=100',
  );

  /* ---- Helpers ---- */
  const planPricings = planPricingData?.data ?? [];
  const planTotal = planPricingData?.total ?? 0;
  const planTotalPages = planPricingData?.totalPages ?? 0;
  const planFrom = planTotal === 0 ? 0 : (planPage - 1) * planLimit + 1;
  const planTo = Math.min(planPage * planLimit, planTotal);

  const topUpPricings = topUpPricingData?.data ?? [];
  const topUpTotal = topUpPricingData?.total ?? 0;
  const topUpTotalPages = topUpPricingData?.totalPages ?? 0;
  const topUpFrom = topUpTotal === 0 ? 0 : (topUpPage - 1) * topUpLimit + 1;
  const topUpTo = Math.min(topUpPage * topUpLimit, topUpTotal);

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={t('title')} description={t('pageDescription')} icon={DollarSign} />

      {/* Tabs */}
      <Tabs defaultValue="plan" className="space-y-6">
        <TabsList>
          <TabsTrigger value="plan">{t('planPricing')}</TabsTrigger>
          <TabsTrigger value="topup">{t('topUpPricing')}</TabsTrigger>
        </TabsList>

        {/* ----- Tab 1: Plan Pricing ----- */}
        <TabsContent value="plan" className="space-y-6">
          <div className="flex items-center justify-end">
            <Button onClick={() => setPlanDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              {t('planPricing')}
            </Button>
          </div>

          <Card className="shadow-sm rounded-lg">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan</TableHead>
                    <TableHead>{t('billingCycle')}</TableHead>
                    <TableHead>{t('price')}</TableHead>
                    <TableHead>{t('currency')}</TableHead>
                    <TableHead>{tc('status')}</TableHead>
                    <TableHead>{tc('createdAt')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {planPricings.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-12 text-center text-sm text-muted-foreground"
                      >
                        {tc('noResults')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    planPricings.map((pp) => (
                      <TableRow key={pp.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          {pp.plan?.planName ?? pp.planId}
                        </TableCell>
                        <TableCell>{pp.billingCycle}</TableCell>
                        <TableCell>{pp.price}</TableCell>
                        <TableCell>{pp.currency}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANT_MAP[pp.status] ?? 'secondary'}>
                            {pp.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(pp.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pagination */}
          {planTotal > 0 && (
            <Pagination
              from={planFrom}
              to={planTo}
              total={planTotal}
              page={planPage}
              totalPages={planTotalPages}
              limit={planLimit}
              onPageChange={setPlanPage}
              onLimitChange={(v) => {
                setPlanLimit(Number(v));
                setPlanPage(1);
              }}
            />
          )}

          {/* Create Plan Pricing Dialog */}
          <CreatePlanPricingDialog
            open={planDialogOpen}
            onOpenChange={setPlanDialogOpen}
            plans={plansData?.data ?? []}
            onCreated={() => mutatePlanPricing()}
          />
        </TabsContent>

        {/* ----- Tab 2: Top-Up Pricing ----- */}
        <TabsContent value="topup" className="space-y-6">
          <div className="flex items-center justify-end">
            <Button onClick={() => setTopUpDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              {t('topUpPricing')}
            </Button>
          </div>

          <Card className="shadow-sm rounded-lg">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Feature Name</TableHead>
                    <TableHead>{t('quotaAmount')}</TableHead>
                    <TableHead>{t('price')}</TableHead>
                    <TableHead>{t('currency')}</TableHead>
                    <TableHead>{t('validityDays')}</TableHead>
                    <TableHead>{tc('status')}</TableHead>
                    <TableHead>{tc('createdAt')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topUpPricings.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-12 text-center text-sm text-muted-foreground"
                      >
                        {tc('noResults')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    topUpPricings.map((tp) => (
                      <TableRow key={tp.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          {tp.feature?.featureName ?? tp.featureId}
                        </TableCell>
                        <TableCell>{tp.quotaAmount}</TableCell>
                        <TableCell>{tp.price}</TableCell>
                        <TableCell>{tp.currency}</TableCell>
                        <TableCell>{tp.validityDays}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANT_MAP[tp.status] ?? 'secondary'}>
                            {tp.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(tp.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pagination */}
          {topUpTotal > 0 && (
            <Pagination
              from={topUpFrom}
              to={topUpTo}
              total={topUpTotal}
              page={topUpPage}
              totalPages={topUpTotalPages}
              limit={topUpLimit}
              onPageChange={setTopUpPage}
              onLimitChange={(v) => {
                setTopUpLimit(Number(v));
                setTopUpPage(1);
              }}
            />
          )}

          {/* Create Top-Up Pricing Dialog */}
          <CreateTopUpPricingDialog
            open={topUpDialogOpen}
            onOpenChange={setTopUpDialogOpen}
            features={featuresData?.data ?? []}
            onCreated={() => mutateTopUpPricing()}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ========================================================================== */
/*  Reusable Pagination                                                       */
/* ========================================================================== */

interface PaginationProps {
  from: number;
  to: number;
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: string) => void;
}

function Pagination({
  from,
  to,
  total,
  page,
  totalPages,
  limit,
  onPageChange,
  onLimitChange,
}: PaginationProps) {
  const tc = useTranslations('common');
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        {tc('showing', { from, to, total })}
      </p>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {tc('rowsPerPage')}
          </span>
          <Select
            value={String(limit)}
            onValueChange={onLimitChange}
          >
            <SelectTrigger className="w-[70px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm px-2">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  Create Plan Pricing Dialog                                                */
/* ========================================================================== */

interface CreatePlanPricingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plans: Plan[];
  onCreated: () => void;
}

function CreatePlanPricingDialog({
  open,
  onOpenChange,
  plans,
  onCreated,
}: CreatePlanPricingDialogProps) {
  const t = useTranslations('pricing');
  const tc = useTranslations('common');
  const [planId, setPlanId] = useState('');
  const [billingCycle, setBillingCycle] = useState('MONTHLY');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [submitting, setSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    setPlanId('');
    setBillingCycle('MONTHLY');
    setPrice('');
    setCurrency('USD');
  }, []);

  const handleSubmit = async () => {
    if (!planId || !price) return;
    setSubmitting(true);
    try {
      await clientFetch('/api/proxy/admin/pricing/plan', {
        method: 'POST',
        body: JSON.stringify({
          planId,
          billingCycle,
          price: Number(price),
          currency,
        }),
      });
      toast.success('Plan pricing created successfully');
      resetForm();
      onOpenChange(false);
      onCreated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create plan pricing');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('planPricing')}</DialogTitle>
          <DialogDescription>Create a new plan pricing entry.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Plan Select */}
          <div className="space-y-2">
            <Label>Plan</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger className="rounded-md">
                <SelectValue placeholder="Select plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={String(plan.id)}>
                    {plan.planName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Billing Cycle */}
          <div className="space-y-2">
            <Label>{t('billingCycle')}</Label>
            <Select value={billingCycle} onValueChange={setBillingCycle}>
              <SelectTrigger className="rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MONTHLY">Monthly</SelectItem>
                <SelectItem value="ANNUALLY">Annually</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label>{t('price')}</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="rounded-md"
            />
          </div>

          {/* Currency */}
          <div className="space-y-2">
            <Label>{t('currency')}</Label>
            <Input
              placeholder="USD"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="rounded-md"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !planId || !price}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {tc('create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ========================================================================== */
/*  Create Top-Up Pricing Dialog                                              */
/* ========================================================================== */

interface CreateTopUpPricingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  features: FeatureRegistry[];
  onCreated: () => void;
}

function CreateTopUpPricingDialog({
  open,
  onOpenChange,
  features,
  onCreated,
}: CreateTopUpPricingDialogProps) {
  const t = useTranslations('pricing');
  const tc = useTranslations('common');
  const [featureId, setFeatureId] = useState('');
  const [quotaAmount, setQuotaAmount] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [validityDays, setValidityDays] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    setFeatureId('');
    setQuotaAmount('');
    setPrice('');
    setCurrency('USD');
    setValidityDays('');
  }, []);

  const handleSubmit = async () => {
    if (!featureId || !quotaAmount || !price || !validityDays) return;
    setSubmitting(true);
    try {
      await clientFetch('/api/proxy/admin/pricing/top-up', {
        method: 'POST',
        body: JSON.stringify({
          featureId,
          quotaAmount: Number(quotaAmount),
          price: Number(price),
          currency,
          validityDays: Number(validityDays),
        }),
      });
      toast.success('Top-up pricing created successfully');
      resetForm();
      onOpenChange(false);
      onCreated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create top-up pricing');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('topUpPricing')}</DialogTitle>
          <DialogDescription>Create a new top-up pricing entry.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Feature Select */}
          <div className="space-y-2">
            <Label>Feature</Label>
            <Select value={featureId} onValueChange={setFeatureId}>
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

          {/* Quota Amount */}
          <div className="space-y-2">
            <Label>{t('quotaAmount')}</Label>
            <Input
              type="number"
              placeholder="100"
              value={quotaAmount}
              onChange={(e) => setQuotaAmount(e.target.value)}
              className="rounded-md"
            />
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label>{t('price')}</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="rounded-md"
            />
          </div>

          {/* Currency */}
          <div className="space-y-2">
            <Label>{t('currency')}</Label>
            <Input
              placeholder="USD"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="rounded-md"
            />
          </div>

          {/* Validity Days */}
          <div className="space-y-2">
            <Label>{t('validityDays')}</Label>
            <Input
              type="number"
              placeholder="30"
              value={validityDays}
              onChange={(e) => setValidityDays(e.target.value)}
              className="rounded-md"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc('cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !featureId || !quotaAmount || !price || !validityDays}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {tc('create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
