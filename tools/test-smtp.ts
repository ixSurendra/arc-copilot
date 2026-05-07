/**
 * Quick SMTP connection test — run locally to verify credentials.
 *
 * Usage:
 *   npx tsx tools/test-smtp.ts
 *
 * Reads SMTP_* values from delivery-package/.env
 */

import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';

// Read .env from delivery-package
function loadEnv(): Record<string, string> {
  const envPath = path.join(__dirname, '..', 'delivery-package', '.env');
  if (!fs.existsSync(envPath)) {
    console.error(`❌ .env not found at ${envPath}`);
    process.exit(1);
  }
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  const env: Record<string, string> = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
  }
  return env;
}

async function main() {
  const env = loadEnv();

  const host = env['SMTP_HOST'] || '';
  const port = parseInt(env['SMTP_PORT'] || '587', 10);
  const secure = env['SMTP_SECURE'] === 'true';
  const user = env['SMTP_USER'] || '';
  const pass = env['SMTP_PASS'] || '';
  const from = env['SMTP_FROM'] || '';

  console.log('═══════════════════════════════════════════');
  console.log('  SMTP Connection Test');
  console.log('═══════════════════════════════════════════');
  console.log(`  Host:   ${host}`);
  console.log(`  Port:   ${port}`);
  console.log(`  Secure: ${secure}`);
  console.log(`  User:   ${user}`);
  console.log(`  From:   ${from}`);
  console.log(`  Pass:   ${pass ? '****' + pass.slice(-4) : '(empty)'}`);
  console.log('');

  if (!host || !user || !pass) {
    console.error('❌ SMTP_HOST, SMTP_USER, or SMTP_PASS is empty. Fill them in delivery-package/.env');
    process.exit(1);
  }

  // Step 1: Test connection (verify)
  console.log('⏳ Step 1: Testing SMTP connection...');
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  try {
    await transporter.verify();
    console.log('✅ SMTP connection successful! Credentials are valid.\n');
  } catch (error) {
    console.error('❌ SMTP connection FAILED:\n');
    console.error(`   ${(error as Error).message}\n`);
    console.log('Common fixes for Office 365:');
    console.log('  1. Generate an App Password (Security → App passwords)');
    console.log('  2. Enable SMTP AUTH in Exchange admin → Active users → Mail');
    console.log('  3. Check if MFA is enabled (App Passwords require MFA)');
    process.exit(1);
  }

  // Step 2: Send a test email
  const testTo = env['ADMIN_EMAIL'] || user;
  console.log(`⏳ Step 2: Sending test email to ${testTo}...`);

  try {
    const info = await transporter.sendMail({
      from,
      to: testTo,
      subject: 'IX Platform — SMTP Test ✓',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>SMTP Test Successful!</h2>
          <p>If you can read this, your SMTP configuration is working correctly.</p>
          <div style="background: #f4f4f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Host:</strong> ${host}</p>
            <p style="margin: 4px 0;"><strong>From:</strong> ${from}</p>
            <p style="margin: 4px 0;"><strong>Time:</strong> ${new Date().toISOString()}</p>
          </div>
        </div>
      `,
    });
    console.log(`✅ Test email sent! MessageId: ${info.messageId}\n`);
    console.log(`   Check the inbox of ${testTo}`);
  } catch (error) {
    console.error('❌ Failed to send test email:\n');
    console.error(`   ${(error as Error).message}`);
    process.exit(1);
  }

  console.log('\n═══════════════════════════════════════════');
  console.log('  All SMTP tests passed! ✓');
  console.log('═══════════════════════════════════════════\n');
}

main();
