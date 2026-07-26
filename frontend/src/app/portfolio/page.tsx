'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { useVisibleRefetchInterval } from '@/hooks/use-visible-refetch';
import {
  Briefcase,
  RefreshCw,
  Wallet,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Layers,
} from 'lucide-react';

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
  if (n > 0) return 'text-emerald-400 font-bold';
  if (n < 0) return 'text-rose-400 font-bold';
  return 'text-slate-400';
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
    <div className="space-y-8">
      <PageHeader
        title="Portfolio & Positions"
        description="Live Polymarket holdings, position values, unrealized PnL, and internal bot inventory tracking."
        action={
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-lg border border-[#1c202b] bg-[#0c0e13] p-1">
              <button
                type="button"
                onClick={() => setSource('bot')}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  source === 'bot'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Bot Funder Account
              </button>
              <button
                type="button"
                onClick={() => setSource('wallet')}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  source === 'wallet'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Connected Web3 Wallet
              </button>
            </div>

            {source === 'bot' ? (
              <button
                type="button"
                disabled={reconcileMut.isPending}
                onClick={() => reconcileMut.mutate()}
                className="flex items-center gap-1.5 rounded-lg border border-[#1c202b] bg-[#11131a] px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-[#181b26] disabled:opacity-50 transition cursor-pointer"
                title="Reconcile local DB positions with live Polymarket holdings"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${
                    reconcileMut.isPending ? 'animate-spin text-emerald-400' : ''
                  }`}
                />
                <span>{reconcileMut.isPending ? 'Reconciling…' : 'Reconcile DB'}</span>
              </button>
            ) : null}
          </div>
        }
      />

      {/* Warnings / Notices */}
      {source === 'wallet' && !isConnected ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs font-semibold text-amber-300 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Connect your Web3 wallet using the top-right button to view its positions.</span>
        </div>
      ) : null}

      {portfolioQ.error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-semibold text-rose-300">
          {(portfolioQ.error as Error).message}
        </div>
      ) : null}

      {reconcileMut.isSuccess ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-300">
          Reconciled: Created {reconcileMut.data.created}, updated {reconcileMut.data.updated} for {short(reconcileMut.data.address)}
        </div>
      ) : null}

      {/* 4 Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Open Positions"
          value={portfolioQ.isLoading ? '…' : (s?.positionCount ?? '0')}
          hint={`${s?.localTrackedCount ?? 0} tracked in local DB`}
          icon={<Briefcase className="h-4 w-4" />}
          tone="info"
        />
        <StatCard
          label="Total Position Value"
          value={portfolioQ.isLoading ? '…' : s ? `$${fmt(s.totalCurrentValue)}` : '—'}
          hint="Sum of current mark values"
          icon={<DollarSign className="h-4 w-4" />}
          tone="default"
        />
        <StatCard
          label="Unrealized PnL"
          value={portfolioQ.isLoading ? '…' : s ? `$${fmt(s.totalCashPnl)}` : '—'}
          hint="Net mark profit/loss"
          icon={
            (s?.totalCashPnl ?? 0) >= 0 ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )
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
          label="USDC Collateral"
          value={
            data?.collateral?.available && data.collateral.balance != null
              ? `$${fmt(Number(data.collateral.balance) / 1e6, 2)}`
              : '—'
          }
          hint={data?.collateral?.note || 'CLOB balance'}
          icon={<Wallet className="h-4 w-4" />}
          tone="good"
        />
      </div>

      {/* Live Positions Table */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-emerald-400" />
            <h2 className="text-base font-bold text-slate-100">Live Positions</h2>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            Viewing: <span className="text-slate-200 font-bold">{short(data?.address)}</span>
          </div>
        </div>

        <div className="saas-card overflow-hidden">
          <table className="saas-table">
            <thead>
              <tr>
                <th>Market Title</th>
                <th>Outcome</th>
                <th>Size</th>
                <th>Avg Price</th>
                <th>Current Mark</th>
                <th>Value ($)</th>
                <th>Unrealized PnL</th>
                <th>Local Net Size</th>
              </tr>
            </thead>
            <tbody>
              {(data?.positions ?? []).length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-xs font-medium text-slate-500">
                    {portfolioQ.isLoading
                      ? 'Loading live positions…'
                      : source === 'bot'
                        ? 'No active positions found for the bot funder account.'
                        : 'No positions found for this wallet on Polymarket.'}
                  </td>
                </tr>
              ) : (
                data!.positions.map((p) => (
                  <tr key={`${p.marketId}-${p.tokenId}`}>
                    <td className="max-w-[280px]">
                      <div className="font-bold text-slate-200 truncate" title={p.title}>
                        {p.title}
                      </div>
                      {p.slug ? (
                        <a
                          href={`https://polymarket.com/event/${p.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:underline mt-0.5"
                        >
                          <span>Open on Polymarket</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                    </td>
                    <td>
                      <span className="rounded bg-slate-800 border border-slate-700 px-2 py-0.5 text-xs font-bold text-slate-200">
                        {p.outcome || '—'}
                      </span>
                    </td>
                    <td className="tabular-nums font-semibold text-slate-200">
                      {fmt(p.size, 4)}
                    </td>
                    <td className="tabular-nums text-slate-400">
                      ${fmt(p.avgPrice, 3)}
                    </td>
                    <td className="tabular-nums text-slate-400">
                      ${fmt(p.curPrice, 3)}
                    </td>
                    <td className="tabular-nums font-bold text-slate-200">
                      ${fmt(p.currentValue)}
                    </td>
                    <td className={`tabular-nums ${pnlClass(p.cashPnl)}`}>
                      ${fmt(p.cashPnl)}
                      {p.percentPnl ? (
                        <span className="ml-1 text-[11px] font-normal opacity-80">
                          ({fmt(p.percentPnl, 1)}%)
                        </span>
                      ) : null}
                    </td>
                    <td className="font-mono text-xs text-slate-500">
                      {p.localNetSize != null ? fmt(p.localNetSize, 4) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
