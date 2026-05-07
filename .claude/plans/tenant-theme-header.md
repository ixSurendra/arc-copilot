# Apply Theme & Header Design to Tenant Pages

## Current State
- **Dashboard** and **Users** pages use `PageHeader` component (gradient banner with icon, title, description, stat cards)
- **Tenant pages** (list, new, detail) use plain `<h1>` headers with no gradient/icon/stats

## Changes

### 1. `tenant-list-client.tsx` — Replace plain header with `PageHeader`
- Add `PageHeader` with `Building2` icon, title, description
- Add stat cards: Total Tenants, Active count, On-Prem count, Cloud count
- Add action button (Create Tenant) styled like users page (`bg-white/20`)
- Keep existing filters/table/pagination as-is

### 2. `tenants/new/page.tsx` — Replace plain header with `PageHeader`
- Add `PageHeader` with `Building2` icon, "Create Tenant" title
- Add breadcrumbs: Tenants → Create Tenant
- Remove the old back button + h1 header

### 3. `tenant-detail-client.tsx` — Replace plain header with `PageHeader`
- Add `PageHeader` with `Building2` icon, tenant name as title
- Add breadcrumbs: Tenants → {tenant name}
- Add stat cards showing tenant info summary (Domain, Billing Cycle, Quota Type, Created)
- Remove the old back button + h1 + Badge header
- Remove the separate "Tenant Info Summary" Card (move into PageHeader stats)
