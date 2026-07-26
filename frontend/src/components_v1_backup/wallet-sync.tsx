'use client';

import { useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { api } from '@/lib/api';

/**
 * When the operator connects a wallet, link it on the backend
 * so it appears under operator wallets.
 */
export function WalletSync() {
  const { address, isConnected, connector } = useAccount();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (!isConnected || !address) return;
    const key = address.toLowerCase();
    if (last.current === key) return;
    last.current = key;

    const label = connector?.name
      ? `${connector.name}`
      : 'Connected wallet';

    api.operator
      .link(address, label, true)
      .catch((err) => {
        console.warn('Failed to sync operator wallet', err);
        last.current = null;
      });
  }, [address, isConnected, connector?.name]);

  return null;
}
