'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { useVisibleRefetchInterval } from '@/hooks/use-visible-refetch';

function short(addr: string | null | undefined) {
  if (!addr) return '—';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function fmt(n: number, digits = 2) {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

function pnlClass(n: number) {
  if (n > 0) return 'text-emerald-400';
  if (n < 0) return 'text-red-400';
  return 'text-zinc-400';
}

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const [source, setSource] = useState<'bot' | 'wallet'>('bot');
  const qc = useQueryClient();
  const interval = useVisibleRefetchInterval(12_000);

  const portfolioQ = useQuery({
    queryKey: ['portfolio', source, address],
    queryFn: () => {
      if (source === 'wallet') {
        if (!address) throw new Error('Connect wallet first');
        return api.portfolio.get('wallet', address);
      }
      return api.portfolio.get('bot');
    },
    enabled: source === 'bot' || (source === 'wallet' && !!address),
    refetchInterval: interval,
    retry: 1,
  });

  const reconcileMut = useMutation({
    mutationFn: () => api.portfolio.reconcile(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portfolio'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  const data = portfolioQ.data;
  const s = data?.summary;

  return (
    <div>
      <PageHeader
        title="Portfolio"
        description="Live Polymarket positions (Data API) plus bot local tracking."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-zinc-700 p-0.5 text-sm">
              <button
                type="button"
                onClick={() => setSource('bot')}
                className={`rounded-md px-3 py-1.5 ${
                  source === 'bot'
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Bot account
              </button>
              <button
                type="button"
                onClick={() => setSource('wallet')}
                className={`rounded-md px-3 py-1.5 ${
                  source === 'wallet'
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Connected wallet
              </button>
            </div>
            {source === 'bot' ? (
              <button
                type="button"
                disabled={reconcileMut.isPending}
                onClick={() => reconcileMut.mutate()}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                title="Sync local bot_positions from live FUNDER holdings"
              >
                {reconcileMut.isPending ? 'Reconciling…' : 'Reconcile bot DB'}
              </button>
            ) : null}
          </div>
        }
      />

      {source === 'wallet' && !isConnected ? (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Connect MetaMask (top right) to load this wallet&apos;s Polymarket
          positions.
        </div>
      ) : null}

      {portfolioQ.error ? (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {(portfolioQ.error as Error).message}
        </div>
      ) : null}

      {(data?.warnings?.length ?? 0) > 0 ? (
        <ul className="mb-4 space-y-1">
          {data!.warnings.map((w) => (
            <li
              key={w}
              className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200/90"
            >
              {w}
            </li>
          ))}
        </ul>
      ) : null}

      {reconcileMut.isSuccess ? (
        <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          Reconciled: created {reconcileMut.data.created}, updated{' '}
          {reconcileMut.data.updated} for {short(reconcileMut.data.address)}
        </div>
      ) : null}
      {reconcileMut.isError ? (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {(reconcileMut.error as Error).message}
        </div>
      ) : null}

      <div className="mb-2 flex flex-wrap gap-3 text-xs text-zinc-500">
        <span>
          Viewing:{' '}
          <span className="font-mono text-zinc-300">
            {short(data?.address)}
          </span>
        </span>
        <span>
          Source:{' '}
          <span className="text-zinc-300">
            {source === 'bot' ? 'Bot (FUNDER)' : 'Connected wallet'}
          </span>
        </span>
        {data?.asOf ? (
          <span>
            As of{' '}
            <span className="text-zinc-400">
              {new Date(data.asOf).toLocaleString()}
            </span>
          </span>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Open positions"
          value={
            portfolioQ.isLoading ? '…' : (s?.positionCount ?? '—')
          }
          hint={`${s?.localTrackedCount ?? 0} local bot tracks`}
        />
        <StatCard
          label="Current value"
          value={
            portfolioQ.isLoading
              ? '…'
              : s
                ? fmt(s.totalCurrentValue)
                : '—'
          }
          hint="Sum of position currentValue"
        />
        <StatCard
          label="Unrealized PnL"
          value={
            portfolioQ.isLoading ? '…' : s ? fmt(s.totalCashPnl) : '—'
          }
          tone={
            (s?.totalCashPnl ?? 0) > 0
              ? 'good'
              : (s?.totalCashPnl ?? 0) < 0
                ? 'bad'
                : 'default'
          }
        />
        <StatCard
          label="Collateral (USDC)"
          value={
            data?.collateral?.available && data.collateral.balance != null
              ? fmt(Number(data.collateral.balance) / 1e6, 2)
              : '—'
          }
          hint={data?.collateral?.note || 'Bot CLOB only'}
        />
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium text-zinc-300">Positions</h2>
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-zinc-900/80 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Market</th>
                <th className="px-4 py-3 font-medium">Outcome</th>
                <th className="px-4 py-3 font-medium">Size</th>
                <th className="px-4 py-3 font-medium">Avg</th>
                <th className="px-4 py-3 font-medium">Mark</th>
                <th className="px-4 py-3 font-medium">Value</th>
                <th className="px-4 py-3 font-medium">PnL</th>
                <th className="px-4 py-3 font-medium">Local</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {(data?.positions ?? []).length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-zinc-500"
                  >
                    {portfolioQ.isLoading
                      ? 'Loading positions…'
                      : source === 'bot'
                        ? 'No live positions. Set FUNDER_ADDRESS to your Polymarket proxy, or wait for copies.'
                        : 'No positions for this wallet on Polymarket.'}
                  </td>
                </tr>
              ) : (
                data!.positions.map((p) => (
                  <tr key={`${p.marketId}-${p.tokenId}`} className="hover:bg-zinc-900/40">
                    <td className="max-w-[240px] px-4 py-3">
                      <div className="truncate text-zinc-200" title={p.title}>
                        {p.title}
                      </div>
                      {p.slug ? (
                        <a
                          href={`https://polymarket.com/event/${p.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-emerald-500/80 hover:underline"
                        >
                          Open market
                        </a>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">{p.outcome || '—'}</td>
                    <td className="px-4 py-3 tabular-nums text-zinc-200">
                      {fmt(p.size, 4)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-zinc-400">
                      {fmt(p.avgPrice, 3)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-zinc-400">
                      {fmt(p.curPrice, 3)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-zinc-200">
                      {fmt(p.currentValue)}
                    </td>
                    <td
                      className={`px-4 py-3 tabular-nums ${pnlClass(p.cashPnl)}`}
                    >
                      {fmt(p.cashPnl)}
                      {p.percentPnl ? (
                        <span className="ml-1 text-[11px] opacity-70">
                          ({fmt(p.percentPnl, 1)}%)
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                      {p.localNetSize != null ? fmt(p.localNetSize, 4) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {source === 'bot' && (data?.localPositions?.length ?? 0) > 0 ? (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-medium text-zinc-300">
            Local bot tracking only
          </h2>
          <p className="mb-2 text-xs text-zinc-600">
            Internal net sizes used by the copy strategy (updated on each copy).
            Use Reconcile to overwrite from live holdings.
          </p>
          <div className="overflow-hidden rounded-xl border border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-900/80 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Token</th>
                  <th className="px-4 py-2 font-medium">Market</th>
                  <th className="px-4 py-2 font-medium">Net size</th>
                  <th className="px-4 py-2 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {data!.localPositions.map((p) => (
                  <tr key={`${p.marketId}-${p.tokenId}`}>
                    <td className="max-w-[160px] truncate px-4 py-2 font-mono text-[11px] text-zinc-400">
                      {p.tokenId}
                    </td>
                    <td className="max-w-[160px] truncate px-4 py-2 font-mono text-[11px] text-zinc-500">
                      {p.marketId}
                    </td>
                    <td className="px-4 py-2 tabular-nums text-zinc-200">
                      {p.netSize}
                    </td>
                    <td className="px-4 py-2 text-xs text-zinc-500">
                      {new Date(p.updatedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
