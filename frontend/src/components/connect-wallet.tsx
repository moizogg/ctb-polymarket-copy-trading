'use client';

import {
  useAccount,
  useConnect,
  useDisconnect,
  useChainId,
  useSwitchChain,
} from 'wagmi';
import { polygon } from 'viem/chains';

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/**
 * Connect any injected browser wallet (MetaMask, Rabby, Trust extension, Brave…).
 * Opens the extension — no WalletConnect project id required.
 */
export function ConnectWallet() {
  const { address, isConnected, isConnecting } = useAccount();
  const { connect, connectors, error, isPending, reset } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain, isPending: switching } = useSwitchChain();

  const wrongNetwork = isConnected && chainId !== polygon.id;
  const connector = connectors[0];

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        {wrongNetwork ? (
          <button
            type="button"
            disabled={switching}
            onClick={() => switchChain({ chainId: polygon.id })}
            className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/20"
          >
            Switch to Polygon
          </button>
        ) : (
          <span className="hidden text-[11px] text-zinc-500 sm:inline">
            Polygon
          </span>
        )}
        <button
          type="button"
          onClick={() => disconnect()}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 font-mono text-xs text-zinc-200 hover:bg-zinc-800"
          title="Click to disconnect"
        >
          {short(address)}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={!connector || isPending || isConnecting}
        onClick={() => {
          reset();
          if (!connector) return;
          // Prefer user-facing name; injected() covers MetaMask when installed
          connect({ connector, chainId: polygon.id });
        }}
        className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-medium text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
      >
        {isPending || isConnecting ? 'Connecting…' : 'Connect Wallet'}
      </button>
      {error ? (
        <span className="max-w-[260px] text-right text-[11px] text-red-400">
          {/provider|ethereum|not found|connector/i.test(error.message)
            ? 'No wallet extension found. Install MetaMask and refresh.'
            : error.message}
        </span>
      ) : (
        <span className="max-w-[240px] text-right text-[10px] text-zinc-600">
          MetaMask / Rabby / Trust extension
        </span>
      )}
    </div>
  );
}
