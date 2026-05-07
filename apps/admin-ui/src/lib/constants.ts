import {
  LayoutDashboard,
  Building2,
  Users,
  Shield,
  FolderClosed,
  Boxes,
  Key,
  CreditCard,
  Layers,
  DollarSign,
  Gauge,
  BarChart3,
  FileText,
  Bell,
  Mail,
  Palette,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Tailwind text color class for the icon (e.g. 'text-teal-500') */
  iconColor?: string;
  /** When true, only SUPER_ADMIN users see this item */
  superAdminOnly?: boolean;
  /** When true, only TENANT_ADMIN users see this item (hidden for super admin) */
  tenantAdminOnly?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
  /** When true, the entire group is hidden for non-super-admins */
  superAdminOnly?: boolean;
}

export const navGroups: NavGroup[] = [
  {
    label: 'nav.overview',
    items: [
      { label: 'nav.dashboard', href: '/admin/dashboard', icon: LayoutDashboard, iconColor: 'text-teal-500' },
    ],
  },
  {
    label: 'nav.management',
    items: [
      { label: 'nav.tenants', href: '/admin/tenants', icon: Building2, iconColor: 'text-violet-500', superAdminOnly: true },
      { label: 'nav.users', href: '/admin/users', icon: Users, iconColor: 'text-blue-500' },
    ],
  },
  {
    label: 'nav.accessControl',
    items: [
      { label: 'nav.roles', href: '/admin/roles', icon: Shield, iconColor: 'text-amber-500' },
      { label: 'nav.groups', href: '/admin/groups', icon: FolderClosed, iconColor: 'text-orange-500' },
      { label: 'nav.modules', href: '/admin/modules', icon: Boxes, iconColor: 'text-pink-500' },
      { label: 'nav.permissions', href: '/admin/permissions', icon: Key, iconColor: 'text-yellow-500' },
    ],
  },
  {
    label: 'nav.licensing',
    superAdminOnly: true,
    items: [
      { label: 'nav.plans', href: '/admin/plans', icon: CreditCard, iconColor: 'text-emerald-500' },
      { label: 'nav.features', href: '/admin/features', icon: Layers, iconColor: 'text-cyan-500' },
      { label: 'nav.pricing', href: '/admin/pricing', icon: DollarSign, iconColor: 'text-green-500' },
      { label: 'nav.quota', href: '/admin/quota', icon: Gauge, iconColor: 'text-red-500' },
      { label: 'nav.usage', href: '/admin/usage', icon: BarChart3, iconColor: 'text-indigo-500' },
      { label: 'nav.licenses', href: '/admin/licenses', icon: FileText, iconColor: 'text-slate-500', superAdminOnly: true },
    ],
  },
  {
    label: 'nav.monitoring',
    items: [
      { label: 'nav.audit', href: '/admin/audit', icon: FileText, iconColor: 'text-rose-500' },
      { label: 'nav.notifications', href: '/admin/notifications', icon: Bell, iconColor: 'text-amber-500' },
      { label: 'nav.emailTemplates', href: '/admin/email-templates', icon: Mail, iconColor: 'text-sky-500' },
      { label: 'nav.branding', href: '/admin/branding', icon: Palette, iconColor: 'text-fuchsia-500' },
    ],
  },
  {
    label: 'nav.system',
    items: [
      { label: 'nav.licenseInfo', href: '/admin/system', icon: Settings, iconColor: 'text-gray-500', tenantAdminOnly: true },
    ],
  },
];
