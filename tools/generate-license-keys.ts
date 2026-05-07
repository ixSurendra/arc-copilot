/**
 * One-time script to generate RSA key pair for on-prem license signing.
 *
 * Usage:
 *   npx ts-node tools/generate-license-keys.ts
 *
 * Output:
 *   tools/keys/private.pem   — Keep SECRET (your cloud server only)
 *   tools/keys/public.pem    — Ship with the on-prem app
 *
 * After generating, set the env vars:
 *   ONPREM_LICENSE_PRIVATE_KEY=<base64 of private.pem>  (cloud .env)
 *   ONPREM_LICENSE_PUBLIC_KEY=<base64 of public.pem>     (on-prem .env)
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const KEYS_DIR = path.join(__dirname, 'keys');

function main() {
  // Create keys directory
  if (!fs.existsSync(KEYS_DIR)) {
    fs.mkdirSync(KEYS_DIR, { recursive: true });
  }

  const privatePath = path.join(KEYS_DIR, 'private.pem');
  const publicPath = path.join(KEYS_DIR, 'public.pem');

  // Check if keys already exist
  if (fs.existsSync(privatePath) || fs.existsSync(publicPath)) {
    console.error('Keys already exist in tools/keys/. Delete them first if you want to regenerate.');
    process.exit(1);
  }

  // Generate RSA 2048-bit key pair
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  // Write key files
  fs.writeFileSync(privatePath, privateKey, 'utf-8');
  fs.writeFileSync(publicPath, publicKey, 'utf-8');

  // Generate base64 versions for env vars
  const privateBase64 = Buffer.from(privateKey).toString('base64');
  const publicBase64 = Buffer.from(publicKey).toString('base64');

  console.log('RSA 2048-bit key pair generated successfully!\n');
  console.log(`Private key: ${privatePath}`);
  console.log(`Public key:  ${publicPath}\n`);
  console.log('Add these to your .env files:\n');
  console.log('--- FOR CLOUD (license generation) ---');
  console.log(`ONPREM_LICENSE_PRIVATE_KEY="${privateBase64}"\n`);
  console.log('--- FOR ON-PREM (license validation) ---');
  console.log(`ONPREM_LICENSE_PUBLIC_KEY="${publicBase64}"\n`);
  console.log('IMPORTANT: Never commit private.pem or share it with customers!');
}

main();
