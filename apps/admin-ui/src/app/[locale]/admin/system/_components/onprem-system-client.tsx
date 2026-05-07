'use client';

import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Clock,
  Users,
  CheckCircle2,
  Activity,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useApi } from '@/hooks/use-api';
import type { OnPremStatus } from '@/types';

function LicenseStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'VALID':
      return <ShieldCheck className="h-5 w-5 text-emerald-500" />;
    case 'EXPIRING_SOON':
      return <ShieldAlert className="h-5 w-5 text-amber-500" />;
    case 'EXPIRED':
      return <ShieldX className="h-5 w-5 text-red-500" />;
    default:
      return <Shield className="h-5 w-5 text-muted-foreground" />;
  }
}

function LicenseStatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'default' | 'destructive' | 'secondary' | 'outline'> = {
    VALID: 'default',
    EXPIRING_SOON: 'secondary',
    EXPIRED: 'destructive',
  };
  const labels: Record<string, string> = {
    VALID: 'Valid',
    EXPIRING_SOON: 'Expiring Soon',
    EXPIRED: 'Expired',
    FILE_NOT_FOUND: 'Not Found',
    INVALID_SIGNATURE: 'Invalid',
    MALFORMED: 'Malformed',
  };

  return (
    <Badge variant={variants[status] || 'outline'}>
      {labels[status] || status}
    </Badge>
  );
}

function ExpiryBar({ daysRemaining }: { daysRemaining: number | null }) {
  if (daysRemaining === null) return null;

  // Map 0-365 to percentage
  const maxDays = 365;
  const pct = Math.min(Math.round((daysRemaining / maxDays) * 100), 100);
  const isDanger = daysRemaining <= 0;
  const isWarning = daysRemaining > 0 && daysRemaining <= 30;

  const barColor = isDanger
    ? 'bg-red-500'
    : isWarning
    ? 'bg-amber-500'
    : 'bg-emerald-500';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Days remaining</span>
        <span
          className={`font-bold tabular-nums ${
            isDanger ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-emerald-600'
          }`}
        >
          {daysRemaining <= 0 ? 'Expired' : `${daysRemaining} days`}
        </span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function FeatureUsageCard({
  featureKey,
  featureName,
  consumed,
}: {
  featureKey: string;
  featureName: string;
  consumed: number;
}) {
  return (
    <div className="border rounded-lg p-3">
      <div className="flex items-center justify-between mb-1">
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{featureName}</p>
          <p className="text-[10px] text-muted-foreground font-mono truncate">
            {featureKey}
          </p>
        </div>
        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
      </div>
      <div className="flex items-center justify-between text-xs mt-2">
        <span className="text-muted-foreground">Unlimited</span>
        {consumed > 0 && (
          <span className="font-semibold tabular-nums text-foreground">
            {consumed.toLocaleString()} used
          </span>
        )}
      </div>
    </div>
  );
}

export function OnPremSystemClient() {
  const { data, isLoading } = useApi<OnPremStatus>(
    '/api/proxy/admin/system/on-prem-status',
  );

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Loading license information...
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="shadow-sm">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Unable to retrieve license information. Please contact your administrator.
        </CardContent>
      </Card>
    );
  }

  const { license, features, totalLicensedFeatures, totalUsed } = data;

  // Split features by category for display
  const dmsFeatures = features.filter(
    (f) =>
      !f.featureKey.startsWith('ai_') &&
      !f.featureKey.startsWith('ai.'),
  );
  const aiFeatures = features.filter(
    (f) =>
      f.featureKey.startsWith('ai_') ||
      f.featureKey.startsWith('ai.'),
  );

  return (
    <div className="space-y-6">
      {/* License Status Card */}
      <Card className="shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <LicenseStatusIcon status={license.status} />
            License Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Status</p>
              <LicenseStatusBadge status={license.status} />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Expires
              </p>
              <p className="text-sm font-medium">
                {license.expiresAt
                  ? new Date(license.expiresAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'N/A'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> Max Users
              </p>
              <p className="text-sm font-medium">
                {license.maxUsers !== null ? license.maxUsers : 'Unlimited'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Shield className="h-3.5 w-3.5" /> Licensed Features
              </p>
              <p className="text-sm font-medium">{totalLicensedFeatures}</p>
            </div>
          </div>

          {/* Expiry progress bar */}
          {license.isValid && (
            <ExpiryBar daysRemaining={license.daysRemaining} />
          )}

          {/* Warning/error message */}
          {license.status === 'EXPIRING_SOON' && (
            <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-800 dark:text-amber-200">
              {license.message}
            </div>
          )}
          {license.status === 'EXPIRED' && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-800 dark:text-red-200">
              {license.message}
            </div>
          )}
          {!license.isValid && license.status !== 'EXPIRED' && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-800 dark:text-red-200">
              {license.message}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">
              {totalLicensedFeatures}
            </p>
            <p className="text-xs text-muted-foreground">Licensed Features</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">
              {dmsFeatures.length}
            </p>
            <p className="text-xs text-muted-foreground">DMS Features</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {aiFeatures.length}
            </p>
            <p className="text-xs text-muted-foreground">AI Features</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{totalUsed}</p>
            <p className="text-xs text-muted-foreground">
              <Activity className="inline h-3 w-3 mr-0.5" />
              Features with Usage
            </p>
          </CardContent>
        </Card>
      </div>

      {/* DMS Features */}
      {dmsFeatures.length > 0 && (
        <Card className="shadow-sm rounded-lg">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Licensed DMS Features
              <Badge variant="secondary" className="text-xs">
                {dmsFeatures.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {dmsFeatures.map((f) => (
                <FeatureUsageCard
                  key={f.featureKey}
                  featureKey={f.featureKey}
                  featureName={f.featureName}
                  consumed={f.consumed}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Features */}
      {aiFeatures.length > 0 && (
        <Card className="shadow-sm rounded-lg">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Licensed AI Features
              <Badge variant="secondary" className="text-xs">
                {aiFeatures.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {aiFeatures.map((f) => (
                <FeatureUsageCard
                  key={f.featureKey}
                  featureKey={f.featureKey}
                  featureName={f.featureName}
                  consumed={f.consumed}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No features */}
      {features.length === 0 && (
        <Card className="shadow-sm">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No features found in the license file.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
