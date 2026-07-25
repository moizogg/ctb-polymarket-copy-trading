import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    const empty = path.join(__dirname, 'src/lib/empty-module.js');
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@react-native-async-storage/async-storage': empty,
      '@x402/evm': empty,
      '@x402/core': empty,
      '@x402/svm': empty,
    };
    return config;
  },
};

export default nextConfig;
