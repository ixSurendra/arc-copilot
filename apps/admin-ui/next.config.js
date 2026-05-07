//@ts-check

const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ['nx', '@nx/devkit', '@nx/next', '@nrwl/next'],
};

module.exports = withNextIntl(nextConfig);
