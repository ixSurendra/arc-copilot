# License Key Management

RSA key pair lifecycle, license generation, validation, and renewal for on-prem deployments.

---

## Overview

The on-prem license system uses RSA 2048-bit asymmetric cryptography:

- **Private key**: Signs license files (kept secret, your cloud server only)
- **Public key**: Verifies license files (shared with every on-prem customer)

One key pair is used for ALL customers. The private key signs each customer's unique license, and the same public key validates all of them.

---

## Key Generation

### Generate RSA Key Pair

```bash
npx ts-node tools/generate-license-keys.ts
```

### Output

```
RSA 2048-bit key pair generated successfully!

Private key: tools/keys/private.pem
Public key:  tools/keys/public.pem

Add these to your .env files:

--- FOR CLOUD (license generation) ---
ONPREM_LICENSE_PRIVATE_KEY="LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0t..."

--- FOR ON-PREM (license validation) ---
ONPREM_LICENSE_PUBLIC_KEY="LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0K..."

IMPORTANT: Never commit private.pem or share it with customers!
```

### Files Created

```
tools/keys/
  private.pem    -- RSA 2048-bit PKCS#8 private key
  public.pem     -- RSA SPKI public key
```

### Safety Check

The script refuses to overwrite existing keys:

```
Keys already exist in tools/keys/. Delete them first if you want to regenerate.
```

---

## Key Storage

### Where Each Key Goes

| Key | Format in `.env` | Who Has It | Where It Lives |
|-----|------------------|-----------|----------------|
| Private key | `ONPREM_LICENSE_PRIVATE_KEY="<Base64>"` | You (vendor) only | `apps/license-service/.env` (local) or Secrets Manager (cloud) |
| Public key | `ONPREM_LICENSE_PUBLIC_KEY="<Base64>"` | You + every on-prem customer | Customer's `.env.onprem` |

### What's Gitignored (Protected)

```
.env                     -- contains private key locally
.env.docker              -- Docker dev env
.env.onprem              -- customer env
tools/keys/              -- raw PEM files
```

### What's Committed (Safe)

```
.env.example             -- no keys, just placeholders
.env.docker.example      -- no keys
.env.onprem.example      -- says "<provided-by-vendor>"
tools/generate-license-keys.ts  -- the generation script (no secrets)
```

---

## License File Format

The `.lic` file is a JSON file with two fields:

```json
{
  "payload": {
    "tenantId": 8,
    "planId": 3,
    "startDate": "2026-03-12T00:00:00.000Z",
    "issuedAt": "2026-03-12T12:30:45.123Z",
    "expiresAt": "2027-03-12T12:30:45.123Z",
    "cycle": "ANNUALLY",
    "maxUsers": null,
    "features": [
      {
        "featureKey": "api-calls",
        "featureName": "API Calls",
        "quotaLimit": null
      },
      {
        "featureKey": "storage-gb",
        "featureName": "Storage",
        "quotaLimit": 100
      }
    ]
  },
  "signature": "kJ7x9mNpQ2r4bG5s..."
}
```

| Field | Description |
|-------|-------------|
| `payload.tenantId` | Integer ID of the customer's tenant |
| `payload.planId` | Integer ID of the plan (from PLAN table) |
| `payload.startDate` | When the license becomes active |
| `payload.issuedAt` | When the license was generated |
| `payload.expiresAt` | When the license expires (1 year from creation) |
| `payload.cycle` | `ANNUALLY` or `MONTHLY` (from tenant's BILLING_CYCLE) |
| `payload.maxUsers` | Max users allowed, or `null` for unlimited |
| `payload.features` | List of enabled features (from PLAN_FEATURE_QUOTA + FEATURE_REGISTRY) |
| `payload.features[].quotaLimit` | Quota limit from the plan, or `null` for unlimited |
| `signature` | Base64-encoded RSA-SHA256 signature of the entire payload |

---

## License Generation

### How It Works (Database-Driven)

The license generator (`tools/generate-license-file.ts`) connects directly to the database to read the tenant's plan and features:

```
1. Read TENANT_ID from: CLI arg > TENANT_ID env var > delivery-package/.env
2. Connect to DB using DATABASE_URL
3. Validate tenant exists in TENANTS table (error if not found)
4. Read tenant's plan: TENANTS.PLAN_ID --> PLAN table --> PLAN_FEATURE_QUOTA + FEATURE_REGISTRY
5. Build payload with tenantId, planId, dates, cycle, maxUsers, features (with quotas)
6. JSON.stringify(payload) --> SHA256 hash --> RSA sign with PRIVATE key
7. Write { payload, signature } to license/license.lic
8. Store TENANT_LICENSE record in DB (marks prior ACTIVE licenses as EXPIRED, increments version)
```

### Generate via CLI Script (Recommended)

```bash
# Option 1: Pass tenant ID as CLI argument
DATABASE_URL=postgresql://... npx tsx tools/generate-license-file.ts 8

# Option 2: Use environment variables
TENANT_ID=8 DATABASE_URL=postgresql://... npx tsx tools/generate-license-file.ts

# Option 3: Values read from delivery-package/.env automatically
npx tsx tools/generate-license-file.ts
```

### Parameters

| Parameter | Source | Required | Description |
|-----------|--------|----------|-------------|
| `TENANT_ID` | CLI arg, env var, or `delivery-package/.env` | Yes | Tenant ID (integer) to generate the license for |
| `DATABASE_URL` | env var or `delivery-package/.env` | Yes | PostgreSQL connection string (license-service DB) |
| `tools/keys/private.pem` | File on disk | Yes | RSA private key (run `generate-license-keys.ts` first) |

### What It Creates

- **File**: `license/license.lic` -- signed license file
- **DB Record**: `TENANT_LICENSE` row with status=ACTIVE, version incremented, signature hash stored
- **Expiry**: 1 year from creation date

### Generate via Swagger (Alternative)

1. Start license-service locally with `ON_PREM=true` and private key in `.env`
2. Open http://localhost:6005/api
3. Find `POST /on-prem/license`
4. Send request with tenantId and cycle
5. Save response JSON as `license.lic`

### Generate via curl (Alternative)

```bash
curl -X POST http://localhost:6005/on-prem/license \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": 8,
    "startDate": "2026-03-12",
    "cycle": "ANNUALLY"
  }' \
  -o license.lic
```

---

## License Validation

### How It Works

```
1. Read license.lic from disk (LICENSE_FILE_PATH)
2. Parse JSON, check structure (payload + signature)
3. JSON.stringify(payload) --> SHA256 hash --> RSA verify with PUBLIC key
4. Check expiresAt vs current date
5. Return validation result
```

### Validation Results

| Status | `isValid` | Meaning |
|--------|-----------|---------|
| `VALID` | `true` | License is valid, 30+ days remaining |
| `EXPIRING_SOON` | `true` | License is valid but expires within 30 days |
| `EXPIRED` | `false` | License has expired |
| `INVALID_SIGNATURE` | `false` | Signature doesn't match (tampered file or wrong public key) |
| `FILE_NOT_FOUND` | `false` | No license file at the configured path |
| `MALFORMED` | `false` | File exists but is not valid JSON or missing fields |

### When Validation Runs

| Trigger | Frequency |
|---------|-----------|
| Application startup | Once (LicenseCronService constructor) |
| Daily cron job | Every day at midnight |
| Every HTTP request | On demand (OnPremLicenseGuard, cached for 5 minutes) |
| `GET /on-prem/license/status` | On demand |
| TCP `validate_license` | On demand |

---

## License Renewal

### When a License Expires

1. Daily cron logs: `LICENSE EXPIRED -- tenant: abc-123 | expired: 2027-03-04`
2. OnPremLicenseGuard blocks ALL requests with 403:

```json
{
  "statusCode": 403,
  "error": "License Invalid",
  "licenseStatus": "EXPIRED",
  "message": "License expired on 2027-03-04. Contact vendor for renewal."
}
```

3. Only `/health` and `/on-prem/license/status` remain accessible

### Renewal Process

1. **You (vendor)**: Generate a new license with a new expiry date

```bash
curl -X POST http://localhost:6005/on-prem/license \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"<same-tenant-uuid>","cycle":"ANNUALLY"}'
```

2. **Send** the new `license.lic` to the customer

3. **Customer**: Replace the file

```bash
cp new-license.lic license/license.lic
```

4. The guard re-validates within 5 minutes (cache TTL) and unblocks requests

No restart needed -- the guard reads the file from disk.

---

## Key Rotation

If your private key is compromised, you must rotate keys:

### Steps

```bash
# 1. Delete old keys
rm tools/keys/private.pem tools/keys/public.pem

# 2. Generate new pair
npx tsx tools/generate-license-keys.ts

# 3. Update YOUR .env with new private key
# ONPREM_LICENSE_PRIVATE_KEY="<new-base64>"

# 4. Re-generate license.lic for EVERY customer (from database)
rm license/license.lic
DATABASE_URL=postgresql://... npx tsx tools/generate-license-file.ts <TENANT_ID>

# 5. Send each customer:
#    - New ONPREM_LICENSE_PUBLIC_KEY value
#    - New license.lic file

# 6. Customer updates .env.onprem and replaces license file
```

### Impact

- All existing licenses become invalid (signed with old key)
- All customers must update simultaneously
- No code changes needed
- No database changes needed

---

## Security Summary

| Do | Don't |
|----|-------|
| Store private key in gitignored `.env` | Commit private key to git |
| Use Secrets Manager in cloud | Hardcode keys in docker-compose.yml |
| Share public key with customers | Share private key with anyone |
| Keep `tools/keys/` in `.gitignore` | Push PEM files to the repo |
| Generate one key pair for all customers | Generate per-customer key pairs |
| Rotate keys if compromised | Ignore a compromised private key |
