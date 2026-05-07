'use client';

import { Gauge, BarChart3 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TenantFeaturesClient } from './tenant-features-client';
import { TenantUsageClient } from './tenant-usage-client';

export function TenantSystemTabs() {
  return (
    <Tabs defaultValue="features" className="space-y-4">
      <TabsList>
        <TabsTrigger value="features">
          <Gauge className="mr-1.5 h-4 w-4" />
          Features & Quotas
        </TabsTrigger>
        <TabsTrigger value="usage">
          <BarChart3 className="mr-1.5 h-4 w-4" />
          Usage History
        </TabsTrigger>
      </TabsList>

      <TabsContent value="features">
        <TenantFeaturesClient />
      </TabsContent>

      <TabsContent value="usage">
        <TenantUsageClient />
      </TabsContent>
    </Tabs>
  );
}
