'use client';

import {
  CheckCircle2,
  XCircle,
  Infinity,
  Gauge,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useApi } from '@/hooks/use-api';
import type { TenantFeatureStatus } from '@/types';

function QuotaProgressBar({
  consumed,
  limit,
  remaining,
}: {
  consumed: number;
  limit: number | null;
  remaining: number | null;
}) {
  if (limit === null) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Infinity className="h-3.5 w-3.5" />
        <span>Unlimited</span>
        {consumed > 0 && (
          <span className="ml-auto tabular-nums font-medium text-foreground">
            {consumed.toLocaleString()} used
          </span>
        )}
      </div>
    );
  }

  const pct = limit > 0 ? Math.min(Math.round((consumed / limit) * 100), 100) : 0;
  const isWarning = pct >= 80 && pct < 100;
  const isDanger = pct >= 100;

  const barColor = isDanger
    ? 'bg-red-500'
    : isWarning
    ? 'bg-amber-500'
    : 'bg-emerald-500';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {consumed.toLocaleString()} / {limit.toLocaleString()}
        </span>
        <span className={`font-semibold tabular-nums ${isDanger ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-emerald-600'}`}>
          {remaining !== null ? `${remaining.toLocaleString()} remaining` : ''}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function FeatureCard({ feature }: { feature: TenantFeatureStatus }) {
  const isBoolean = feature.quota.limit === null && feature.quota.consumed === 0;
  const isNumeric = !isBoolean;

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{feature.featureName}</p>
            <p className="text-xs text-muted-foreground font-mono truncate">
              {feature.featureKey}
            </p>
          </div>
          {feature.enabled ? (
            <Badge variant="default" className="shrink-0 bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Enabled
            </Badge>
          ) : (
            <Badge variant="destructive" className="shrink-0">
              <XCircle className="mr-1 h-3 w-3" />
              Disabled
            </Badge>
          )}
        </div>

        {feature.description && (
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
            {feature.description}
          </p>
        )}

        {feature.enabled && isNumeric && (
          <QuotaProgressBar
            consumed={feature.quota.consumed}
            limit={feature.quota.limit}
            remaining={feature.quota.remaining}
          />
        )}

        {feature.enabled && isBoolean && feature.quota.limit === null && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Infinity className="h-3.5 w-3.5" />
            <span>Unlimited</span>
          </div>
        )}

        {feature.quota.source === 'top_up' && (
          <Badge variant="outline" className="mt-2 text-xs">
            Using top-up quota
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

export function TenantFeaturesClient() {
  const { data: features, isLoading } = useApi<TenantFeatureStatus[]>(
    '/api/proxy/admin/system/features',
  );

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Loading features...
        </CardContent>
      </Card>
    );
  }

  if (!features || features.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No features configured for your plan.
        </CardContent>
      </Card>
    );
  }

  // Group by category
  const categories = new Map<string, TenantFeatureStatus[]>();
  for (const f of features) {
    const cat = f.category || 'general';
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat)!.push(f);
  }

  const categoryLabels: Record<string, string> = {
    dms: 'Document Management',
    ai: 'AI & Intelligence',
    general: 'General',
  };

  const categoryKeys = Array.from(categories.keys());

  // Summary stats
  const enabledCount = features.filter((f) => f.enabled).length;
  const disabledCount = features.length - enabledCount;
  const quotaFeatures = features.filter(
    (f) => f.enabled && f.quota.limit !== null && f.quota.limit > 0,
  );
  const nearLimitCount = quotaFeatures.filter(
    (f) => f.quota.remaining !== null && f.quota.limit !== null && f.quota.remaining / f.quota.limit < 0.2,
  ).length;

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{features.length}</p>
            <p className="text-xs text-muted-foreground">Total Features</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{enabledCount}</p>
            <p className="text-xs text-muted-foreground">Enabled</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-500">{disabledCount}</p>
            <p className="text-xs text-muted-foreground">Disabled</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 text-center">
            <p className={`text-2xl font-bold ${nearLimitCount > 0 ? 'text-amber-500' : 'text-muted-foreground'}`}>
              {nearLimitCount}
            </p>
            <p className="text-xs text-muted-foreground">Near Quota Limit</p>
          </CardContent>
        </Card>
      </div>

      {/* Feature cards by category */}
      {categoryKeys.length > 1 ? (
        <Tabs defaultValue={categoryKeys[0]} className="space-y-4">
          <TabsList>
            {categoryKeys.map((key) => (
              <TabsTrigger key={key} value={key}>
                <Gauge className="mr-1.5 h-3.5 w-3.5" />
                {categoryLabels[key] || key}
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                  {categories.get(key)!.length}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
          {categoryKeys.map((key) => (
            <TabsContent key={key} value={key}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {categories.get(key)!.map((f) => (
                  <FeatureCard key={f.featureKey} feature={f} />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <FeatureCard key={f.featureKey} feature={f} />
          ))}
        </div>
      )}
    </div>
  );
}
