'use client';

/**
 * Import injected from @wagmi/core — NOT from 'wagmi/connectors'.
 * wagmi/connectors barrels MetaMask SDK, Coinbase, WalletConnect and breaks Next.js.
 */
import { createConfig, http, injected } from '@wagmi/core';
import { polygon } from 'viem/chains';

export const wagmiConfig = createConfig({
  chains: [polygon],
  connectors: [
    injected({
      shimDisconnect: true,
    }),
  ],
  transports: {
    [polygon.id]: http(),
  },
  ssr: true,
});
