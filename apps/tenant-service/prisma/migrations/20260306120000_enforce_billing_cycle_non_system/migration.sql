-- Enforce: only the system tenant (ID = 0) can have NULL BILLING_CYCLE
-- This prevents on-prem users from bypassing app-level validation via direct DB access

CREATE OR REPLACE FUNCTION enforce_billing_cycle_non_system()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."ID" != 0
     AND NEW."BILLING_CYCLE" IS NULL THEN
    RAISE EXCEPTION 'BILLING_CYCLE cannot be NULL for non-system tenants';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_billing_cycle
  BEFORE INSERT OR UPDATE ON "TENANTS"
  FOR EACH ROW
  EXECUTE FUNCTION enforce_billing_cycle_non_system();
