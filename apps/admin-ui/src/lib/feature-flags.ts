/**
 * Build-time feature flags for arc-copilot's admin-ui.
 *
 * Today these gate cloud-only surfaces (pricing / quota / usage) that
 * the on-prem fork doesn't ship by default. Flip the env to true if
 * you ever build for a cloud SKU.
 *
 * Vite/Next baking: NEXT_PUBLIC_* values are inlined at build time, so
 * this works equally on the server (SSR / route handlers) and in the
 * browser bundle.
 */
export function isCloudFeaturesEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ARC_CLOUD_FEATURES_ENABLED === "true";
}
