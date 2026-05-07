'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/hooks/use-api';
import { clientFetch } from '@/lib/api-client-browser';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface FeatureConfig {
  id: number;
  tenantId: number;
  featureId: number;
  isEnabled: boolean;
  configValue: string | null;
  feature: {
    id: number;
    featureKey: string;
    featureName: string;
    description: string | null;
    category: string | null;
    valueType: string;
    defaultValue: string | null;
  };
}

interface TenantAiConfigTabProps {
  tenantId: number;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** Group configs by category keyword for visual grouping */
function groupConfigs(configs: FeatureConfig[]) {
  const groups: Record<string, FeatureConfig[]> = {
    'Processing': [],
    'Limits': [],
    'OCR Settings': [],
    'Search Settings': [],
    'Other': [],
  };

  for (const config of configs) {
    const key = config.feature.featureKey.toLowerCase();
    const name = config.feature.featureName.toLowerCase();
    const combined = `${key} ${name}`;

    if (combined.includes('ocr')) {
      groups['OCR Settings'].push(config);
    } else if (combined.includes('search')) {
      groups['Search Settings'].push(config);
    } else if (combined.includes('limit') || combined.includes('max') || combined.includes('quota')) {
      groups['Limits'].push(config);
    } else if (config.feature.valueType === 'boolean') {
      groups['Processing'].push(config);
    } else {
      groups['Other'].push(config);
    }
  }

  // Remove empty groups
  return Object.fromEntries(
    Object.entries(groups).filter(([, items]) => items.length > 0),
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Component                                                             */
/* -------------------------------------------------------------------------- */

export function TenantAiConfigTab({ tenantId }: TenantAiConfigTabProps) {
  const {
    data: configs,
    error,
    isLoading,
    mutate,
  } = useApi<FeatureConfig[]>(
    `/api/proxy/admin/tenant-feature-config/${tenantId}?category=ai`,
  );

  const [savingMap, setSavingMap] = useState<Record<number, boolean>>({});

  const handleToggle = useCallback(
    async (config: FeatureConfig, checked: boolean) => {
      setSavingMap((prev) => ({ ...prev, [config.featureId]: true }));
      try {
        await clientFetch(
          `/api/proxy/admin/tenant-feature-config/${tenantId}/${config.featureId}`,
          {
            method: 'PUT',
            body: JSON.stringify({
              isEnabled: checked,
              configValue: config.configValue,
            }),
          },
        );
        toast.success(`${config.feature.featureName} ${checked ? 'enabled' : 'disabled'}`);
        mutate();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update config');
      } finally {
        setSavingMap((prev) => ({ ...prev, [config.featureId]: false }));
      }
    },
    [tenantId, mutate],
  );

  const handleValueChange = useCallback(
    async (config: FeatureConfig, value: string) => {
      setSavingMap((prev) => ({ ...prev, [config.featureId]: true }));
      try {
        await clientFetch(
          `/api/proxy/admin/tenant-feature-config/${tenantId}/${config.featureId}`,
          {
            method: 'PUT',
            body: JSON.stringify({
              isEnabled: config.isEnabled,
              configValue: value,
            }),
          },
        );
        toast.success(`${config.feature.featureName} updated`);
        mutate();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update config');
      } finally {
        setSavingMap((prev) => ({ ...prev, [config.featureId]: false }));
      }
    },
    [tenantId, mutate],
  );

  /* ---- Loading state ---- */
  if (isLoading) {
    return (
      <Card className="max-w-2xl shadow-sm rounded-lg">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>
    );
  }

  /* ---- Error state ---- */
  if (error) {
    return (
      <Card className="max-w-2xl shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle className="text-lg">AI Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Failed to load AI configuration. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  /* ---- Empty state ---- */
  if (!configs || configs.length === 0) {
    return (
      <Card className="max-w-2xl shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle className="text-lg">AI Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No AI features are configured for this tenant. Features must be
            created in the Features management section first.
          </p>
        </CardContent>
      </Card>
    );
  }

  const grouped = groupConfigs(configs);

  return (
    <Card className="max-w-2xl shadow-sm rounded-lg">
      <CardHeader>
        <CardTitle className="text-lg">AI Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(grouped).map(([groupName, items], groupIndex) => (
          <div key={groupName}>
            {groupIndex > 0 && <Separator className="mb-6" />}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {groupName}
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {items.length}
                </Badge>
              </div>
              {items.map((config) => (
                <ConfigRow
                  key={config.featureId}
                  config={config}
                  saving={savingMap[config.featureId] ?? false}
                  onToggle={handleToggle}
                  onValueChange={handleValueChange}
                />
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*  Config Row                                                                 */
/* -------------------------------------------------------------------------- */

interface ConfigRowProps {
  config: FeatureConfig;
  saving: boolean;
  onToggle: (config: FeatureConfig, checked: boolean) => void;
  onValueChange: (config: FeatureConfig, value: string) => void;
}

function ConfigRow({ config, saving, onToggle, onValueChange }: ConfigRowProps) {
  const [localValue, setLocalValue] = useState(config.configValue ?? '');
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Sync local value when config changes from server
  useEffect(() => {
    setLocalValue(config.configValue ?? '');
  }, [config.configValue]);

  const handleInputChange = useCallback(
    (value: string) => {
      setLocalValue(value);
      if (debounceTimer) clearTimeout(debounceTimer);
      const timer = setTimeout(() => {
        onValueChange(config, value);
      }, 800);
      setDebounceTimer(timer);
    },
    [config, debounceTimer, onValueChange],
  );

  const { valueType } = config.feature;

  if (valueType === 'boolean') {
    return (
      <div className="flex items-center justify-between py-2">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium cursor-pointer">
            {config.feature.featureName}
          </Label>
          {config.feature.description && (
            <p className="text-xs text-muted-foreground">
              {config.feature.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          <Switch
            checked={config.isEnabled}
            onCheckedChange={(checked) => onToggle(config, checked)}
            disabled={saving}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 py-2">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">
            {config.feature.featureName}
          </Label>
          {config.feature.description && (
            <p className="text-xs text-muted-foreground">
              {config.feature.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          <Switch
            checked={config.isEnabled}
            onCheckedChange={(checked) => onToggle(config, checked)}
            disabled={saving}
          />
        </div>
      </div>
      <Input
        type={valueType === 'integer' ? 'number' : 'text'}
        className="rounded-md max-w-xs"
        value={localValue}
        onChange={(e) => handleInputChange(e.target.value)}
        disabled={saving || !config.isEnabled}
        placeholder={config.feature.defaultValue ?? ''}
      />
    </div>
  );
}
