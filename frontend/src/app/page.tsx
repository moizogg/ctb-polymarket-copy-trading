'use client';

import { ComponentType, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { useVisibleRefetchInterval } from '@/hooks/use-visible-refetch';
import Link from 'next/link';
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  ShieldAlert,
  Zap,
  TrendingUp,
  Activity,
  Calendar,
  Layers,
  ChevronRight,
} from 'lucide-react';

function statusTone(status: string) {
  if (status === 'COPIED')
    return {
      bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      label: 'COPIED',
    };
  if (status === 'SKIPPED')
    return {
      bg: 'bg-slate-800/60 text-slate-400 border-slate-700/50',
      label: 'SKIPPED',
    };
  if (status === 'FAILED')
    return {
      bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      label: 'FAILED',
    };
  return {
    bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    label: status,
  };
}

function SectionTitle({
  title,
  subtitle,
  icon: Icon,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: ComponentType<{ className?: string }>;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        {Icon ? <Icon className="h-5 w-5 text-emerald-400" /> : null}
        <div>
          <h2 className="text-base font-bold text-slate-100">{title}</h2>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  );
}

function EmptyRow({
  colSpan,
  loading,
  message,
}: {
  colSpan: number;
  loading?: boolean;
  message: string;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-4 py-12 text-center text-xs font-medium text-slate-500"
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2 text-slate-400">
            <Activity className="h-4 w-4 animate-spin text-emerald-400" />
            <span>Fetching real-time data…</span>
          </div>
        ) : (
          message
        )}
      </td>
    </tr>
  );
}

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const fast = useVisibleRefetchInterval(4_000);
  const mid = useVisibleRefetchInterval(15_000);
  const slow = useVisibleRefetchInterval(30_000);

  const botQ = useQuery({
    queryKey: ['bot-status'],
    queryFn: () => api.bot.status(),
    refetchInterval: fast,
  });

  const statsQ = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.dashboard.stats(),
    refetchInterval: fast,
  });

  const tradesQ = useQuery({
    queryKey: ['recent-trades'],
    queryFn: () => api.dashboard.recentTrades(15),
    refetchInterval: fast,
  });

  const weeklyQ = useQuery({
    queryKey: ['weekly-reports'],
    queryFn: () => api.dashboard.weekly(8),
    refetchInterval: slow,
  });

  const compareQ = useQuery({
    queryKey: ['compare-analysis'],
    queryFn: () => api.dashboard.compare(),
    refetchInterval: mid,
  });

  const bot = botQ.data;
  const s = statsQ.data;
  const compare = compareQ.data;
  const err =
    statsQ.error || tradesQ.error || weeklyQ.error || compareQ.error;

  const copyEnabled = bot?.copyTradingEnabled ?? false;

  const toggleMutation = useMutation({
    mutationFn: (enable: boolean) =>
      enable ? api.bot.resume() : api.bot.pause('Dashboard Banner Action'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bot-status'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Overview Console"
        description="Real-time copy-trading metrics, leader tracking, execution latency, and security controls."
        action={
          <Link
            href="/settings"
            className="flex items-center gap-1.5 rounded-lg border border-[#1c202b] bg-[#12141c] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-[#181b26] hover:text-slate-100 transition"
          >
            <span>Trading Setup</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      {/* API Error Notification */}
      {err ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Backend Communication Notice</div>
            <div className="mt-1 text-rose-400/90">
              Cannot connect to API at{' '}
              <code className="rounded bg-black/40 px-1 py-0.5 text-rose-200">
                {process.env.NEXT_PUBLIC_API_URL || 'https://sparkling-exploration-production-2ad5.up.railway.app'}
              </code>
            </div>
            <div className="mt-1 text-[11px] text-rose-400/70">
              {(err as Error).message}
            </div>
          </div>
        </div>
      ) : null}

      {/* Primary Engine Status & Control Banner */}
      <div
        className={`saas-card relative overflow-hidden p-6 border ${
          copyEnabled
            ? 'border-emerald-500/30 bg-gradient-to-r from-emerald-950/20 via-[#0f1117] to-[#0f1117]'
            : 'border-amber-500/30 bg-gradient-to-r from-amber-950/20 via-[#0f1117] to-[#0f1117]'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl border ${
                copyEnabled
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}
            >
              {copyEnabled ? (
                <ShieldCheck className="h-6 w-6" />
              ) : (
                <ShieldAlert className="h-6 w-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    copyEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <h3 className="text-lg font-bold text-slate-100">
                  {copyEnabled
                    ? 'Copy Trading Live'
                    : 'Copy Trading Paused (Kill Switch Active)'}
                </h3>
              </div>
              <p className="mt-1 text-xs text-slate-400 max-w-xl">
                {copyEnabled
                  ? 'The engine is actively polling leader transactions and placing matching orders on Polymarket CLOB.'
                  : 'Safety kill-switch is active. Incoming trades will be recorded as SKIPPED until you resume execution.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => toggleMutation.mutate(!copyEnabled)}
              disabled={toggleMutation.isPending}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition cursor-pointer shadow-md ${
                copyEnabled
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
              }`}
            >
              <Zap className="h-4 w-4" />
              <span>{copyEnabled ? 'Activate Kill Switch (Pause)' : 'Resume Copy Trading'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Core Financial KPI Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Tracked Leaders"
          value={statsQ.isLoading ? '…' : (s?.walletsCount ?? '0')}
          hint={`${s?.activeWalletsCount ?? 0} active wallets polling`}
          icon={<Users className="h-4 w-4" />}
          tone="info"
        />
        <StatCard
          label="Trades Copied"
          value={statsQ.isLoading ? '…' : (s?.tradesCopied ?? '0')}
          hint={`${s?.tradesCopiedLast7Days ?? 0} trades last 7 days`}
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone="good"
        />
        <StatCard
          label="Execution Success"
          value={statsQ.isLoading ? '…' : s ? `${s.copyRatePercent}%` : '—'}
          hint={`${s?.tradesSkipped ?? 0} skipped · ${s?.tradesFailed ?? 0} failed`}
          icon={<TrendingUp className="h-4 w-4" />}
          tone={s && s.copyRatePercent > 50 ? 'good' : 'warn'}
        />
        <StatCard
          label="Avg Copy Latency"
          value={
            statsQ.isLoading
              ? '…'
              : s?.avgCopyLatencyMs != null
                ? `${s.avgCopyLatencyMs} ms`
                : '—'
          }
          hint={
            s?.lastCopyLatencyMs != null
              ? `Last trade ${s.lastCopyLatencyMs} ms`
              : 'No live latency recorded'
          }
          icon={<Clock className="h-4 w-4" />}
          tone="default"
        />
      </div>

      {/* Bot vs Leaders Breakdown Matrix */}
      <section className="space-y-4">
        <SectionTitle
          title="Bot Performance Breakdown"
          subtitle="Real-time breakdown of copied vs skipped vs failed signals per followed leader."
          icon={Layers}
        />

        <div className="grid gap-4 lg:grid-cols-4">
          {/* Summary Breakdown Card */}
          <div className="saas-card p-5 lg:col-span-1 flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Bot Signal Aggregate
              </div>

              {compareQ.isLoading ? (
                <div className="mt-6 text-xs text-slate-500">Loading summary…</div>
              ) : compare ? (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Total Signals</span>
                    <span className="font-bold tabular-nums text-slate-200">
                      {compare.bot.totalSignals}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Copied</span>
                    <span className="font-bold tabular-nums text-emerald-400">
                      {compare.bot.totalCopied}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Skipped</span>
                    <span className="font-bold tabular-nums text-slate-400">
                      {compare.bot.totalSkipped}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Failed</span>
                    <span className="font-bold tabular-nums text-rose-400">
                      {compare.bot.totalFailed}
                    </span>
                  </div>

                  <div className="border-t border-[#1c202b] pt-3 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">Copy Success Rate</span>
                    <span className="font-bold text-slate-100 text-sm tabular-nums">
                      {compare.bot.copyRatePercent}%
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-6 text-xs text-slate-500">No signals recorded yet.</div>
              )}
            </div>

            <div className="mt-6 rounded-lg bg-[#0d0f15] border border-[#1c202b] p-3 text-[11px] text-slate-400 leading-relaxed">
              <span className="font-bold text-slate-300">Note:</span> Failed trades automatically generate CRITICAL alerts in the system log.
            </div>
          </div>

          {/* Leaders Comparison Table */}
          <div className="saas-card overflow-hidden lg:col-span-3">
            <table className="saas-table">
              <thead>
                <tr>
                  <th>Leader Wallet</th>
                  <th>Total Signals</th>
                  <th>Copied</th>
                  <th>Skipped</th>
                  <th>Failed</th>
                  <th>Success %</th>
                  <th>Fail %</th>
                </tr>
              </thead>
              <tbody>
                {(compare?.leaders ?? []).length === 0 ? (
                  <EmptyRow
                    colSpan={7}
                    loading={compareQ.isLoading}
                    message="No leader signals recorded yet. Rows populate automatically when leaders make trades."
                  />
                ) : (
                  compare!.leaders.map((L) => (
                    <tr key={L.wallet}>
                      <td>
                        <div className="font-bold text-slate-200">
                          {L.label || 'Unlabeled Leader'}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500">
                          {L.wallet.slice(0, 12)}…{L.wallet.slice(-6)}
                        </div>
                      </td>
                      <td className="tabular-nums font-semibold text-slate-300">
                        {L.totalSignals}
                      </td>
                      <td className="tabular-nums font-semibold text-emerald-400">
                        {L.copied}
                      </td>
                      <td className="tabular-nums font-semibold text-slate-400">
                        {L.skipped}
                      </td>
                      <td className="tabular-nums font-semibold text-rose-400">
                        {L.failed}
                      </td>
                      <td className="tabular-nums font-bold text-slate-200">
                        {L.copyRatePercent}%
                      </td>
                      <td className="tabular-nums text-slate-400">
                        {L.failRatePercent}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Live Recent Trade Stream */}
      <section className="space-y-4">
        <SectionTitle
          title="Recent Trade Stream"
          subtitle="Real-time log of incoming signals and execution status."
          icon={Activity}
          action={
            <Link
              href="/activity"
              className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
            >
              <span>View All Stream</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          }
        />

        <div className="saas-card overflow-hidden">
          <table className="saas-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Leader</th>
                <th>Side</th>
                <th>Size</th>
                <th>Execution Status</th>
                <th>Details / Reason</th>
              </tr>
            </thead>
            <tbody>
              {(tradesQ.data ?? []).length === 0 ? (
                <EmptyRow
                  colSpan={6}
                  loading={tradesQ.isLoading}
                  message="No recent trade activity. Poller is scanning Polymarket activity logs."
                />
              ) : (
                tradesQ.data!.map((t) => {
                  const badge = statusTone(t.status);
                  return (
                    <tr key={t.id}>
                      <td className="font-mono text-xs text-slate-400">
                        {new Date(t.createdAt).toLocaleString()}
                      </td>
                      <td>
                        <div className="font-semibold text-slate-200">
                          {t.walletLabel || 'Leader'}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500">
                          {t.wallet.slice(0, 8)}…
                        </div>
                      </td>
                      <td>
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-bold ${
                            t.side === 'BUY'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {t.side}
                        </span>
                      </td>
                      <td className="tabular-nums font-semibold text-slate-200">
                        {t.executedSize || t.size}
                      </td>
                      <td>
                        <span
                          className={`inline-flex rounded border px-2.5 py-0.5 text-[11px] font-bold ${badge.bg}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="max-w-[280px] truncate text-xs text-slate-400 font-mono">
                        {t.reason || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Weekly Activity Summary */}
      <section className="space-y-4">
        <SectionTitle
          title="Weekly Volume Reports"
          subtitle="Historical 8-week performance metrics (Monday-start)."
          icon={Calendar}
        />

        <div className="saas-card overflow-hidden">
          <table className="saas-table">
            <thead>
              <tr>
                <th>Week Range</th>
                <th>Total Signals</th>
                <th>Copied</th>
                <th>Skipped</th>
                <th>Failed</th>
                <th>Success Rate</th>
                <th>Active Leaders</th>
              </tr>
            </thead>
            <tbody>
              {(weeklyQ.data ?? []).length === 0 ? (
                <EmptyRow
                  colSpan={7}
                  loading={weeklyQ.isLoading}
                  message="No weekly logs recorded yet."
                />
              ) : (
                weeklyQ.data!.map((w) => (
                  <tr key={`${w.weekStart}-${w.weekEnd}`}>
                    <td className="font-mono text-xs font-semibold text-slate-300">
                      {w.weekStart}
                      <span className="text-slate-600"> → </span>
                      {w.weekEnd}
                    </td>
                    <td className="tabular-nums font-semibold text-slate-300">
                      {w.totalTrades}
                    </td>
                    <td className="tabular-nums font-semibold text-emerald-400">
                      {w.tradesCopied}
                    </td>
                    <td className="tabular-nums font-semibold text-slate-400">
                      {w.tradesSkipped}
                    </td>
                    <td className="tabular-nums font-semibold text-rose-400">
                      {w.tradesFailed}
                    </td>
                    <td className="tabular-nums font-bold text-slate-200">
                      {w.copyRatePercent}%
                    </td>
                    <td className="tabular-nums text-slate-400">
                      {w.byWallet?.length ?? 0} leaders
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
