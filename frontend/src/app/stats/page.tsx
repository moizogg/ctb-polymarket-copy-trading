'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, RecentTrade } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { useVisibleRefetchInterval } from '@/hooks/use-visible-refetch';

function fmt(n: number | null | undefined, decimals = 2) {
  if (n == null || !Number.isFinite(n)) return '$0.00';
  return `$${n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

function fmtNum(n: number | null | undefined, decimals = 0) {
  if (n == null || !Number.isFinite(n)) return '0';
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function short(addr: string | null | undefined) {
  if (!addr) return '—';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function StatsPage() {
  const [timeframe, setTimeframe] = useState<'all' | '7d' | '24h'>('all');
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

  const equityQ = useQuery({
    queryKey: ['bot-equity'],
    queryFn: () => api.charts.equity(),
    refetchInterval,
  });

  const trades = tradesQ.data ?? [];
  const portfolio = portfolioQ.data;
  const stats = statsQ.data;
  const compare = compareQ.data;
  const equity = equityQ.data;

  // Filter trades based on timeframe
  const filteredTrades = useMemo(() => {
    if (timeframe === 'all') return trades;
    const now = Date.now();
    const cutoff =
      timeframe === '24h'
        ? now - 24 * 60 * 60 * 1000
        : now - 7 * 24 * 60 * 60 * 1000;
    return trades.filter((t) => new Date(t.createdAt).getTime() >= cutoff);
  }, [trades, timeframe]);

  // Derived financial metrics
  const financialMetrics = useMemo(() => {
    const copiedTrades = filteredTrades.filter((t) => t.status === 'COPIED');
    let amountSpent = 0;
    let maxTradeCost = 0;

    const leaderSpentMap = new Map<
      string,
      { spent: number; copiedCount: number; label: string | null }
    >();

    copiedTrades.forEach((t) => {
      const sz = parseFloat(t.executedSize || t.size || '0');
      const pr = parseFloat(t.price || '0');
      const cost = sz * pr;
      amountSpent += cost;
      if (cost > maxTradeCost) maxTradeCost = cost;

      const key = t.wallet;
      const cur = leaderSpentMap.get(key) || {
        spent: 0,
        copiedCount: 0,
        label: t.walletLabel || null,
      };
      cur.spent += cost;
      cur.copiedCount += 1;
      leaderSpentMap.set(key, cur);
    });

    const avgTradeCost =
      copiedTrades.length > 0 ? amountSpent / copiedTrades.length : 0;

    // Portfolio metrics
    const currentPositionValue = portfolio?.summary?.totalCurrentValue ?? 0;
    const unrealizedPnl = portfolio?.summary?.totalCashPnl ?? 0;
    const realizedPnl = portfolio?.summary?.totalRealizedPnl ?? 0;
    const usdcBalance = portfolio?.collateral?.balance
      ? Number(portfolio.collateral.balance) / 1e6
      : 0;

    // Total Amount Earned = Current Value of Open Positions + Realized PnL + Collateral Balance
    const amountEarned = currentPositionValue + realizedPnl;
    const netRevenueGenerated = unrealizedPnl + realizedPnl;

    return {
      amountSpent,
      amountEarned,
      netRevenueGenerated,
      currentPositionValue,
      unrealizedPnl,
      realizedPnl,
      usdcBalance,
      avgTradeCost,
      maxTradeCost,
      totalCopiedCount: copiedTrades.length,
      leaderSpentMap,
    };
  }, [filteredTrades, portfolio]);

  const leaderBreakdown = useMemo(() => {
    if (!compare?.leaders) return [];
    return compare.leaders.map((l) => {
      const spentData = financialMetrics.leaderSpentMap.get(l.wallet);
      return {
        ...l,
        amountSpent: spentData?.spent ?? 0,
        avgSpentPerTrade:
          l.copied > 0 ? (spentData?.spent ?? 0) / l.copied : 0,
      };
    });
  }, [compare, financialMetrics]);

  const isLoading =
    statsQ.isLoading || portfolioQ.isLoading || tradesQ.isLoading;

  return (
    <div>
      <PageHeader
        title="Detailed Financial & Execution Stats"
        description="Granular breakdown of capital spent, positions current value, net revenue generated, and execution stats."
        action={
          <div className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/80 p-1">
            {(
              [
                ['all', 'All Time'],
                ['7d', 'Last 7 Days'],
                ['24h', 'Last 24 Hours'],
              ] as const
            ).map(([tf, label]) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                  timeframe === tf
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        }
      />

      {/* Financial Overview KPIs */}
      <section className="mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Financial Overview
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Amount Spent"
            value={isLoading ? '…' : fmt(financialMetrics.amountSpent)}
            hint={`Capital deployed across ${financialMetrics.totalCopiedCount} copied trades`}
            tone="default"
          />
          <StatCard
            label="Current Portfolio Value"
            value={isLoading ? '…' : fmt(financialMetrics.currentPositionValue)}
            hint={`${portfolio?.summary?.positionCount ?? 0} active market holdings`}
            tone="good"
          />
          <StatCard
            label="Net Revenue / Profit"
            value={isLoading ? '…' : fmt(financialMetrics.netRevenueGenerated)}
            hint={`Unrealized: ${fmt(financialMetrics.unrealizedPnl)} · Realized: ${fmt(financialMetrics.realizedPnl)}`}
            tone={
              financialMetrics.netRevenueGenerated > 0
                ? 'good'
                : financialMetrics.netRevenueGenerated < 0
                  ? 'bad'
                  : 'default'
            }
          />
          <StatCard
            label="USDC Collateral Balance"
            value={isLoading ? '…' : fmt(financialMetrics.usdcBalance)}
            hint={portfolio?.collateral?.note || 'CLOB cash balance'}
            tone="good"
          />
        </div>
      </section>

      {/* Execution Statistics KPIs */}
      <section className="mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Trade Execution Metrics
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Trades Processed"
            value={isLoading ? '…' : fmtNum(stats?.totalTrades)}
            hint={`${stats?.tradesCopied ?? 0} copied · ${stats?.tradesSkipped ?? 0} skipped · ${stats?.tradesFailed ?? 0} failed`}
            tone="info"
          />
          <StatCard
            label="Copy Success Rate"
            value={isLoading ? '…' : `${stats?.copyRatePercent ?? 0}%`}
            hint={`Failure rate: ${stats?.failRatePercent ?? 0}%`}
            tone={(stats?.copyRatePercent ?? 0) >= 80 ? 'good' : 'default'}
          />
          <StatCard
            label="Average Trade Cost"
            value={isLoading ? '…' : fmt(financialMetrics.avgTradeCost)}
            hint={`Max single trade: ${fmt(financialMetrics.maxTradeCost)}`}
            tone="default"
          />
          <StatCard
            label="Avg Execution Latency"
            value={
              isLoading
                ? '…'
                : stats?.avgExecutionLatencyMs != null
                  ? `${stats.avgExecutionLatencyMs} ms`
                  : '—'
            }
            hint={
              stats?.lastCopyLatencyMs != null
                ? `Last trade latency: ${stats.lastCopyLatencyMs} ms`
                : 'CLOB order placement time'
            }
            tone="info"
          />
        </div>
      </section>

      {/* Leader Expenditure & Performance Breakdown */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Capital Deployment & Performance by Leader
          </h2>
          <span className="text-xs text-zinc-500 font-mono">
            {leaderBreakdown.length} Leader Wallets Tracked
          </span>
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-800 bg-zinc-950/80 text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
              <tr>
                <th className="px-4 py-3">Leader Wallet</th>
                <th className="px-4 py-3">Signals Received</th>
                <th className="px-4 py-3">Trades Copied</th>
                <th className="px-4 py-3">Copy Rate</th>
                <th className="px-4 py-3">Total Amount Spent</th>
                <th className="px-4 py-3">Avg Capital / Trade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {leaderBreakdown.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-xs text-zinc-500"
                  >
                    No leader data recorded yet.
                  </td>
                </tr>
              ) : (
                leaderBreakdown.map((l) => (
                  <tr key={l.wallet} className="hover:bg-zinc-900/60 transition">
                    <td className="px-4 py-3 font-mono">
                      <div className="font-semibold text-zinc-200">
                        {l.label || short(l.wallet)}
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        {short(l.wallet)}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-zinc-300">
                      {l.totalSignals}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-emerald-400">
                      {l.copied}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-emerald-500/10 px-2 py-0.5 font-mono text-xs font-semibold text-emerald-400">
                        {l.copyRatePercent}%
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-zinc-200">
                      {fmt(l.amountSpent)}
                    </td>
                    <td className="px-4 py-3 font-mono text-zinc-400">
                      {fmt(l.avgSpentPerTrade)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Detailed Copied Trades Financial Ledger */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Recent Copied Trades Financial Ledger
          </h2>
          <span className="text-xs text-zinc-500 font-mono">
            Showing {filteredTrades.length} Trades
          </span>
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-800 bg-zinc-950/80 text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Leader</th>
                <th className="px-4 py-3">Side</th>
                <th className="px-4 py-3">Size (Shares)</th>
                <th className="px-4 py-3">Price ($)</th>
                <th className="px-4 py-3">Total Amount Spent ($)</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredTrades.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-xs text-zinc-500"
                  >
                    No trade ledger history found.
                  </td>
                </tr>
              ) : (
                filteredTrades.map((t: RecentTrade) => {
                  const sizeNum = parseFloat(t.executedSize || t.size || '0');
                  const priceNum = parseFloat(t.price || '0');
                  const spent = sizeNum * priceNum;
                  const isCopied = t.status === 'COPIED';

                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-zinc-900/60 transition"
                    >
                      <td className="px-4 py-3 font-mono text-[11px] text-zinc-400">
                        {new Date(t.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-mono text-zinc-300">
                        {t.walletLabel || short(t.wallet)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            t.side === 'BUY'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {t.side}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-zinc-200">
                        {fmtNum(sizeNum, 2)}
                      </td>
                      <td className="px-4 py-3 font-mono text-zinc-400">
                        ${priceNum.toFixed(3)}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-zinc-100">
                        {isCopied ? fmt(spent) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-2 py-0.5 text-[11px] font-medium ${
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
                      <td className="px-4 py-3 font-mono text-[11px] text-zinc-500">
                        {t.latencyMs != null ? `${t.latencyMs} ms` : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
