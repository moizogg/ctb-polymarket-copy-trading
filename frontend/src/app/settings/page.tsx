'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { api, API_URL } from '@/lib/api';
import { PageHeader } from '@/components/page-header';

export default function SettingsPage() {
  const qc = useQueryClient();
  const { address, isConnected, connector } = useAccount();

  const botQ = useQuery({
    queryKey: ['bot-status'],
    queryFn: () => api.bot.status(),
    refetchInterval: 5_000,
  });

  const linkedQ = useQuery({
    queryKey: ['operator-wallets'],
    queryFn: () => api.operator.list(),
    refetchInterval: 10_000,
  });

  const pauseMut = useMutation({
    mutationFn: () => api.bot.pause('Paused from dashboard'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bot-status'] }),
  });

  const resumeMut = useMutation({
    mutationFn: () => api.bot.resume(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bot-status'] }),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => api.operator.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['operator-wallets'] }),
  });

  const running = botQ.data?.copyTradingEnabled;

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Kill switch, linked wallets, and API connection."
      />

      <section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="text-sm font-medium text-zinc-200">Copy trading</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Pause stops new copy orders. The poller still runs and logs skips.
          Disconnecting MetaMask does <strong>not</strong> pause the bot.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              running
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-amber-500/10 text-amber-400'
            }`}
          >
            {running ? 'Running' : 'Paused'}
          </span>
          {botQ.data?.pauseReason ? (
            <span className="text-xs text-zinc-500">
              {botQ.data.pauseReason}
            </span>
          ) : null}
          {running ? (
            <button
              type="button"
              disabled={pauseMut.isPending}
              onClick={() => pauseMut.mutate()}
              className="rounded-lg bg-amber-500/90 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
            >
              Pause bot
            </button>
          ) : (
            <button
              type="button"
              disabled={resumeMut.isPending}
              onClick={() => resumeMut.mutate()}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
            >
              Resume bot
            </button>
          )}
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="text-sm font-medium text-zinc-200">Connected wallet</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Use Connect Wallet (top right) with a browser extension: MetaMask,
          Rabby, Trust extension, etc. Network: Polygon.
        </p>
        <div className="mt-3 space-y-1 font-mono text-xs text-zinc-400">
          <div>
            Status:{' '}
            <span className="text-zinc-200">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div>
            Address:{' '}
            <span className="text-zinc-200">{address || '—'}</span>
          </div>
          <div>
            Connector:{' '}
            <span className="text-zinc-200">{connector?.name || '—'}</span>
          </div>
        </div>

        {isConnected && address ? (
          <div className="mt-4 border-t border-zinc-800/80 pt-3">
            <button
              type="button"
              onClick={async () => {
                try {
                  const resolved = await api.polymarket.proxyWallet(address);
                  const funder = resolved.proxyWallet || address;
                  await api.bot.saveConfig({ funderAddress: funder });
                  qc.invalidateQueries({ queryKey: ['bot-status'] });
                  alert(`Execution wallet set to ${funder}! To enable live trading, turn off the Pause Kill Switch above.`);
                } catch (err: any) {
                  alert(`Failed setting execution wallet: ${err.message}`);
                }
              }}
              className="rounded-lg bg-emerald-500/90 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-emerald-400"
            >
              ⚡ Link Connected Wallet for Live Trading
            </button>
          </div>
        ) : null}
      </section>

      <section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="mb-3 text-sm font-medium text-zinc-200">
          Linked operator wallets
        </h2>
        <ul className="space-y-2">
          {(linkedQ.data ?? []).length === 0 ? (
            <li className="text-sm text-zinc-500">
              None yet. Connect a wallet to auto-link.
            </li>
          ) : (
            linkedQ.data!.map((w) => (
              <li
                key={w.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800 px-3 py-2 text-sm"
              >
                <div>
                  <div className="font-mono text-xs text-zinc-300">
                    {w.address}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {w.label || '—'}
                    {w.isPrimary ? ' · primary' : ''}
                  </div>
                </div>
                <button
                  type="button"
                  className="text-xs text-red-400 hover:underline"
                  onClick={() => removeMut.mutate(w.id)}
                >
                  Unlink
                </button>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="text-sm font-medium text-zinc-200">API</h2>
        <p className="mt-2 font-mono text-xs text-zinc-400">{API_URL}</p>
        <p className="mt-1 text-xs text-zinc-600">
          Execution address: {botQ.data?.executionAddress || 'not set in backend .env'}
        </p>
      </section>
    </div>
  );
}
