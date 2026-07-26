'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, RecentTrade } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { useVisibleRefetchInterval } from '@/hooks/use-visible-refetch';

function fmt(n: number | null | undefined, decimals = 2) {
  if (n == null || !Number.isFinite(n)) return '$0.00';
  return `$${n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

function fmtNum(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return '0';
  return n.toLocaleString();
}

function short(addr: string | null | undefined) {
  if (!addr) return '—';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function StatsPage() {
  const [timeframe, setTimeframe] = useState<'all' | '7d' | '24h'>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'leaders' | 'ledger'>('overview');
  const refetchInterval = useVisibleRefetchInterval(10_000);

  const statsQ = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.dashboard.stats(),
    refetchInterval,
  });

  const portfolioQ = useQuery({
    queryKey: ['portfolio', 'bot'],
    queryFn: () => api.portfolio.get('bot'),
    refetchInterval,
  });

  const tradesQ = useQuery({
    queryKey: ['recent-trades-stats'],
    queryFn: () => api.dashboard.recentTrades(200, false),
    refetchInterval,
  });

  const compareQ = useQuery({
    queryKey: ['dashboard-compare'],
    queryFn: () => api.dashboard.compare(),
    refetchInterval,
  });

  const rawTrades = tradesQ.data;
  const portfolio = portfolioQ.data;
  const stats = statsQ.data;
  const compare = compareQ.data;

  // Filter trades based on timeframe
  const filteredTrades = useMemo(() => {
    const tradesList = rawTrades ?? [];
    if (timeframe === 'all') return tradesList;
    const now = Date.now();
    const cutoff =
      timeframe === '24h'
        ? now - 24 * 60 * 60 * 1000
        : now - 7 * 24 * 60 * 60 * 1000;
    return tradesList.filter((t) => new Date(t.createdAt).getTime() >= cutoff);
  }, [rawTrades, timeframe]);

  // Financial calculations
  const fin = useMemo(() => {
    const copiedTrades = filteredTrades.filter((t) => t.status === 'COPIED');
    let amountSpent = 0;
    let maxTradeCost = 0;

    const leaderSpentMap = new Map<
      string,
      { spent: number; count: number; label: string | null }
    >();

    copiedTrades.forEach((t) => {
      const sz = parseFloat(t.executedSize || t.size || '0');
      const pr = parseFloat(t.price || '0');
      const cost = sz * pr;
      amountSpent += cost;
      if (cost > maxTradeCost) maxTradeCost = cost;

      const cur = leaderSpentMap.get(t.wallet) || {
        spent: 0,
        count: 0,
        label: t.walletLabel || null,
      };
      cur.spent += cost;
      cur.count += 1;
      leaderSpentMap.set(t.wallet, cur);
    });

    const avgTradeCost =
      copiedTrades.length > 0 ? amountSpent / copiedTrades.length : 0;

    const currentValue = portfolio?.summary?.totalCurrentValue ?? 0;
    const unrealizedPnl = portfolio?.summary?.totalCashPnl ?? 0;
    const realizedPnl = portfolio?.summary?.totalRealizedPnl ?? 0;
    const netRevenue = unrealizedPnl + realizedPnl;
    const usdcBalance = portfolio?.collateral?.balance
      ? Number(portfolio.collateral.balance) / 1e6
      : 0;

    const roiPercent =
      amountSpent > 0 ? (netRevenue / amountSpent) * 100 : 0;

    return {
      amountSpent,
      currentValue,
      unrealizedPnl,
      realizedPnl,
      netRevenue,
      usdcBalance,
      avgTradeCost,
      maxTradeCost,
      roiPercent,
      copiedCount: copiedTrades.length,
      leaderSpentMap,
    };
  }, [filteredTrades, portfolio]);

  const leaderList = useMemo(() => {
    if (!compare?.leaders) return [];
    return compare.leaders.map((l) => {
      const spentData = fin.leaderSpentMap.get(l.wallet);
      const spent = spentData?.spent ?? 0;
      return {
        ...l,
        amountSpent: spent,
        avgSpent: l.copied > 0 ? spent / l.copied : 0,
        shareOfSpent: fin.amountSpent > 0 ? (spent / fin.amountSpent) * 100 : 0,
      };
    });
  }, [compare, fin]);

  const isLoading = statsQ.isLoading || portfolioQ.isLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Performance & Capital Analytics"
        description="Clean, real-time insights into your total capital spent, earnings, and leader execution."
        action={
          <div className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/90 p-1">
            {(
              [
                ['all', 'All Time'],
                ['7d', 'Last 7 Days'],
                ['24h', '24 Hours'],
              ] as const
            ).map(([tf, label]) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  timeframe === tf
                    ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        }
      />

      {/* Primary Highlight Cards - Big, Clean, Readable */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Amount Spent Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition hover:border-zinc-700">
          <div className="text-xs font-medium text-zinc-400">Total Amount Spent</div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-zinc-100">
            {isLoading ? '…' : fmt(fin.amountSpent)}
          </div>
          <div className="mt-2 text-xs text-zinc-500">
            Deployed across <span className="font-semibold text-zinc-300">{fin.copiedCount}</span> trades
          </div>
        </div>

        {/* Net Revenue / Profit Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition hover:border-zinc-700">
          <div className="text-xs font-medium text-zinc-400">Net Revenue Generated</div>
          <div
            className={`mt-2 text-2xl font-bold tracking-tight ${
              fin.netRevenue > 0
                ? 'text-emerald-400'
                : fin.netRevenue < 0
                  ? 'text-rose-400'
                  : 'text-zinc-100'
            }`}
          >
            {isLoading ? '…' : `${fin.netRevenue >= 0 ? '+' : ''}${fmt(fin.netRevenue)}`}
          </div>
          <div className="mt-2 text-xs text-zinc-500">
            Return on Capital: <span className="font-semibold text-zinc-300">{fin.roiPercent.toFixed(1)}%</span>
          </div>
        </div>

        {/* Current Portfolio Value */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition hover:border-zinc-700">
          <div className="text-xs font-medium text-zinc-400">Current Position Value</div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-emerald-400">
            {isLoading ? '…' : fmt(fin.currentValue)}
          </div>
          <div className="mt-2 text-xs text-zinc-500">
            {portfolio?.summary?.positionCount ?? 0} active Polymarket positions
          </div>
        </div>

        {/* Total Trades & Copy Rate */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition hover:border-zinc-700">
          <div className="text-xs font-medium text-zinc-400">Copy Success Rate</div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-sky-400">
            {isLoading ? '…' : `${stats?.copyRatePercent ?? 0}%`}
          </div>
          <div className="mt-2 text-xs text-zinc-500">
            {stats?.tradesCopied ?? 0} copied / {stats?.totalTrades ?? 0} signals
          </div>
        </div>
      </div>

      {/* Tab Switcher - Eliminates Endless Scrolling / Clutter */}
      <div className="flex border-b border-zinc-800">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === 'overview'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Capital Breakdown
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('leaders')}
          className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === 'leaders'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Leader Capital Allocation ({leaderList.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ledger')}
          className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === 'ledger'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Trade Ledger ({filteredTrades.length})
        </button>
      </div>

      {/* TAB 1: Capital Breakdown */}
      {activeTab === 'overview' && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Detailed Money Flow */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-zinc-200">
              Financial Summary Breakdown
            </h3>
            <div className="divide-y divide-zinc-800/80 text-xs">
              <div className="flex justify-between py-2.5">
                <span className="text-zinc-400">Total Capital Spent</span>
                <span className="font-mono font-semibold text-zinc-100">
                  {fmt(fin.amountSpent)}
                </span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-zinc-400">Open Positions Mark Value</span>
                <span className="font-mono font-semibold text-emerald-400">
                  {fmt(fin.currentValue)}
                </span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-zinc-400">Unrealized Cash PnL</span>
                <span
                  className={`font-mono font-semibold ${
                    fin.unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {fmt(fin.unrealizedPnl)}
                </span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-zinc-400">Realized PnL</span>
                <span
                  className={`font-mono font-semibold ${
                    fin.realizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {fmt(fin.realizedPnl)}
                </span>
              </div>
              <div className="flex justify-between py-2.5 pt-3">
                <span className="font-semibold text-zinc-200">Available USDC Collateral</span>
                <span className="font-mono font-bold text-emerald-400">
                  {fmt(fin.usdcBalance)}
                </span>
              </div>
            </div>
          </div>

          {/* Trade Execution Sizing */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-zinc-200">
              Execution Sizing & Latency Stats
            </h3>
            <div className="divide-y divide-zinc-800/80 text-xs">
              <div className="flex justify-between py-2.5">
                <span className="text-zinc-400">Average Trade Cost</span>
                <span className="font-mono font-semibold text-zinc-100">
                  {fmt(fin.avgTradeCost)}
                </span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-zinc-400">Largest Single Trade</span>
                <span className="font-mono font-semibold text-zinc-100">
                  {fmt(fin.maxTradeCost)}
                </span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-zinc-400">Average Execution Speed</span>
                <span className="font-mono font-semibold text-sky-400">
                  {stats?.avgExecutionLatencyMs != null
                    ? `${stats.avgExecutionLatencyMs} ms`
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-zinc-400">Failed / Skipped Ratio</span>
                <span className="font-mono font-semibold text-zinc-400">
                  {stats?.tradesSkipped ?? 0} skipped · {stats?.tradesFailed ?? 0} failed
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Leader Capital Allocation */}
      {activeTab === 'leaders' && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {leaderList.length === 0 ? (
              <div className="col-span-2 rounded-2xl border border-zinc-800 p-8 text-center text-xs text-zinc-500">
                No active leader data found for this timeframe.
              </div>
            ) : (
              leaderList.map((l) => (
                <div
                  key={l.wallet}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm text-zinc-200">
                        {l.label || short(l.wallet)}
                      </div>
                      <div className="font-mono text-xs text-zinc-500">
                        {short(l.wallet)}
                      </div>
                    </div>
                    <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-400 font-mono">
                      {l.copyRatePercent}% Success
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 rounded-xl bg-zinc-950/60 p-3 text-xs">
                    <div>
                      <div className="text-zinc-500 text-[11px]">Capital Spent</div>
                      <div className="font-mono font-bold text-zinc-100 mt-0.5">
                        {fmt(l.amountSpent)}
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-500 text-[11px]">Avg / Trade</div>
                      <div className="font-mono font-medium text-zinc-300 mt-0.5">
                        {fmt(l.avgSpent)}
                      </div>
                    </div>
                  </div>

                  {/* Share of Total Capital Bar */}
                  <div>
                    <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                      <span>Share of Spent Capital</span>
                      <span className="font-mono font-semibold">{l.shareOfSpent.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(2, l.shareOfSpent))}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Clean Trade Ledger Table */}
      {activeTab === 'ledger' && (
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-800 bg-zinc-950/90 text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
              <tr>
                <th className="px-4 py-3.5">Time</th>
                <th className="px-4 py-3.5">Leader</th>
                <th className="px-4 py-3.5">Side</th>
                <th className="px-4 py-3.5">Shares</th>
                <th className="px-4 py-3.5">Price</th>
                <th className="px-4 py-3.5">Amount Spent</th>
                <th className="px-4 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-xs text-zinc-500">
                    No trades recorded for this timeframe.
                  </td>
                </tr>
              ) : (
                filteredTrades.map((t: RecentTrade) => {
                  const sizeNum = parseFloat(t.executedSize || t.size || '0');
                  const priceNum = parseFloat(t.price || '0');
                  const spent = sizeNum * priceNum;
                  const isCopied = t.status === 'COPIED';

                  return (
                    <tr key={t.id} className="hover:bg-zinc-900/80 transition">
                      <td className="px-4 py-3 font-mono text-zinc-400">
                        {new Date(t.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3 font-mono text-zinc-200">
                        {t.walletLabel || short(t.wallet)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            t.side === 'BUY'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {t.side}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-zinc-300">
                        {fmtNum(sizeNum)}
                      </td>
                      <td className="px-4 py-3 font-mono text-zinc-400">
                        ${priceNum.toFixed(3)}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-zinc-100">
                        {isCopied ? fmt(spent) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                            isCopied
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : t.status === 'SKIPPED'
                                ? 'bg-zinc-800 text-zinc-400'
                                : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
