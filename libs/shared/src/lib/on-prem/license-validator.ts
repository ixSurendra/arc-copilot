import * as crypto from 'crypto';
import * as fs from 'fs';
import {
  LicenseFile,
  LicensePayload,
  LicenseStatus,
  LicenseValidationResult,
} from './license-validator.interfaces';

/** Days before expiry to start warning */
const EXPIRY_WARNING_DAYS = 30;

/**
 * Validates an on-prem license file.
 *
 * - Reads the .lic file from disk
 * - Verifies the RSA signature with the public key
 * - Checks the expiry date
 * - Returns a structured validation result
 *
 * This is a pure utility function (no NestJS dependencies)
 * so it can be used in guards, cron jobs, or startup checks.
 */
export function validateLicenseFile(
  licenseFilePath: string,
  publicKeyBase64: string,
): LicenseValidationResult {
  // 1. Check file exists
  if (!fs.existsSync(licenseFilePath)) {
    return {
      status: LicenseStatus.FILE_NOT_FOUND,
      isValid: false,
      message: `License file not found at: ${licenseFilePath}`,
    };
  }

  // 2. Read and parse file
  let licenseFile: LicenseFile;
  try {
    const raw = fs.readFileSync(licenseFilePath, 'utf-8');
    licenseFile = JSON.parse(raw) as LicenseFile;
  } catch {
    return {
      status: LicenseStatus.MALFORMED,
      isValid: false,
      message: 'License file is corrupted or not valid JSON',
    };
  }

  // 3. Validate structure
  if (!licenseFile.payload || !licenseFile.signature) {
    return {
      status: LicenseStatus.MALFORMED,
      isValid: false,
      message: 'License file is missing payload or signature',
    };
  }

  // 4. Verify RSA signature
  try {
    const publicKeyPem = Buffer.from(publicKeyBase64, 'base64').toString('utf-8');
    const keyObject = crypto.createPublicKey({
      key: publicKeyPem,
      format: 'pem',
      type: 'spki',
    });

    const verify = crypto.createVerify('SHA256');
    verify.update(JSON.stringify(licenseFile.payload));
    verify.end();

    const isSignatureValid = verify.verify(keyObject, licenseFile.signature, 'base64');
    if (!isSignatureValid) {
      return {
        status: LicenseStatus.INVALID_SIGNATURE,
        isValid: false,
        message: 'License signature verification failed — file may have been tampered with',
      };
    }
  } catch {
    return {
      status: LicenseStatus.INVALID_SIGNATURE,
      isValid: false,
      message: 'Failed to verify license signature — invalid key or signature format',
    };
  }

  // 5. Check expiry
  const payload: LicensePayload = licenseFile.payload;
  const now = new Date();
  const expiresAt = new Date(payload.expiresAt);
  const diffMs = expiresAt.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysRemaining <= 0) {
    return {
      status: LicenseStatus.EXPIRED,
      isValid: false,
      tenantId: payload.tenantId,
      expiresAt: payload.expiresAt,
      daysRemaining: 0,
      maxUsers: payload.maxUsers ?? null,
      features: payload.features,
      message: `License expired on ${expiresAt.toISOString().split('T')[0]}. Contact vendor for renewal.`,
    };
  }

  if (daysRemaining <= EXPIRY_WARNING_DAYS) {
    return {
      status: LicenseStatus.EXPIRING_SOON,
      isValid: true,
      tenantId: payload.tenantId,
      expiresAt: payload.expiresAt,
      daysRemaining,
      maxUsers: payload.maxUsers ?? null,
      features: payload.features,
      message: `License expires in ${daysRemaining} day(s). Please renew soon.`,
    };
  }

  return {
    status: LicenseStatus.VALID,
    isValid: true,
    tenantId: payload.tenantId,
    expiresAt: payload.expiresAt,
    daysRemaining,
    maxUsers: payload.maxUsers ?? null,
    features: payload.features,
    message: `License is valid. Expires in ${daysRemaining} day(s).`,
  };
}
