export interface TenantBranding {
  id: number;
  tenantId: number;
  companyName: string;
  logoUrl?: string | null;
  primaryColor: string;
  secondaryColor?: string | null;
  footerText?: string | null;
  usePrimaryAsTheme: boolean;
  createdAt: Date;
  updatedAt: Date;
}
