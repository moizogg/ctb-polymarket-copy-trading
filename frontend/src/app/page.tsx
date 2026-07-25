'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { useVisibleRefetchInterval } from '@/hooks/use-visible-refetch';

function statusTone(status: string) {
  if (status === 'COPIED') return 'text-emerald-400 bg-emerald-500/10';
  if (status === 'SKIPPED') return 'text-zinc-400 bg-zinc-500/10';
  if (status === 'FAILED') return 'text-red-400 bg-red-500/10';
  return 'text-amber-400 bg-amber-500/10';
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-3">
      <h2 className="text-sm font-medium text-zinc-300">{title}</h2>
      {subtitle ? (
        <p className="mt-0.5 text-xs text-zinc-600">{subtitle}</p>
      ) : null}
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
      <td colSpan={colSpan} className="px-4 py-10 text-center text-zinc-500">
        {loading ? 'Loading…' : message}
      </td>
    </tr>
  );
}

export default function DashboardPage() {
  const fast = useVisibleRefetchInterval(4_000);
  const mid = useVisibleRefetchInterval(15_000);
  const slow = useVisibleRefetchInterval(30_000);

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

  const s = statsQ.data;
  const compare = compareQ.data;
  const err =
    statsQ.error || tradesQ.error || weeklyQ.error || compareQ.error;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Live copy-trading overview, weekly reports, and bot vs leaders."
      />

      {err ? (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Cannot reach API. Is the backend running on{' '}
          <code className="text-red-200">
            {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}
          </code>
          ?
          <div className="mt-1 text-xs text-red-400/80">
            {(err as Error).message}
          </div>
        </div>
      ) : null}

      {/* KPI cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Leaders"
          value={statsQ.isLoading ? '…' : (s?.walletsCount ?? '—')}
          hint={`${s?.activeWalletsCount ?? 0} active`}
        />
        <StatCard
          label="Copied"
          value={statsQ.isLoading ? '…' : (s?.tradesCopied ?? '—')}
          hint={`${s?.tradesCopiedLast7Days ?? 0} last 7 days`}
          tone="good"
        />
        <StatCard
          label="Copy rate"
          value={statsQ.isLoading ? '…' : s ? `${s.copyRatePercent}%` : '—'}
          hint={`${s?.tradesSkipped ?? 0} skipped · ${s?.tradesFailed ?? 0} failed`}
        />
        <StatCard
          label="Avg latency"
          value={
            statsQ.isLoading
              ? '…'
              : s?.avgCopyLatencyMs != null
                ? `${s.avgCopyLatencyMs} ms`
                : '—'
          }
          hint={
            s?.lastCopyLatencyMs != null
              ? `Last ${s.lastCopyLatencyMs} ms`
              : 'No copies yet'
          }
        />
      </div>

      {/* Bot vs leaders */}
      <section className="mt-8">
        <SectionTitle
          title="Bot vs leaders"
          subtitle="How copy outcomes break down for the bot overall and per leader."
        />
        <div className="grid gap-3 lg:grid-cols-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 lg:col-span-1">
            <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              Bot totals
            </div>
            {compareQ.isLoading ? (
              <p className="mt-3 text-sm text-zinc-500">Loading…</p>
            ) : compare ? (
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Copied</dt>
                  <dd className="font-medium text-emerald-400">
                    {compare.bot.totalCopied}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Skipped</dt>
                  <dd className="text-zinc-300">{compare.bot.totalSkipped}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Failed</dt>
                  <dd className="text-red-400">{compare.bot.totalFailed}</dd>
                </div>
                <div className="flex justify-between border-t border-zinc-800 pt-2">
                  <dt className="text-zinc-500">Copy rate</dt>
                  <dd className="font-semibold text-zinc-100">
                    {compare.bot.copyRatePercent}%
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-3 text-sm text-zinc-500">No data yet.</p>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-zinc-800 lg:col-span-3">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-900/80 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Leader</th>
                  <th className="px-4 py-3 font-medium">Signals</th>
                  <th className="px-4 py-3 font-medium">Copied</th>
                  <th className="px-4 py-3 font-medium">Skipped</th>
                  <th className="px-4 py-3 font-medium">Failed</th>
                  <th className="px-4 py-3 font-medium">Copy %</th>
                  <th className="px-4 py-3 font-medium">Fail %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {(compare?.leaders ?? []).length === 0 ? (
                  <EmptyRow
                    colSpan={7}
                    loading={compareQ.isLoading}
                    message="No leader signals yet. After the bot sees trades, rows appear here."
                  />
                ) : (
                  compare!.leaders.map((L) => (
                    <tr key={L.wallet} className="hover:bg-zinc-900/40">
                      <td className="px-4 py-3">
                        <div className="text-zinc-200">
                          {L.label || '—'}
                        </div>
                        <div className="font-mono text-[11px] text-zinc-500">
                          {L.wallet.slice(0, 10)}…
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-zinc-300">
                        {L.totalSignals}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-emerald-400">
                        {L.copied}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-zinc-400">
                        {L.skipped}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-red-400">
                        {L.failed}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-zinc-200">
                        {L.copyRatePercent}%
                      </td>
                      <td className="px-4 py-3 tabular-nums text-zinc-400">
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

      {/* Weekly reports */}
      <section className="mt-8">
        <SectionTitle
          title="Weekly reports"
          subtitle="Last 8 weeks of copy activity (Monday-start weeks)."
        />
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-900/80 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Week</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Copied</th>
                <th className="px-4 py-3 font-medium">Skipped</th>
                <th className="px-4 py-3 font-medium">Failed</th>
                <th className="px-4 py-3 font-medium">Copy rate</th>
                <th className="px-4 py-3 font-medium">Leaders active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {(weeklyQ.data ?? []).length === 0 ? (
                <EmptyRow
                  colSpan={7}
                  loading={weeklyQ.isLoading}
                  message="No weekly data yet. Weeks fill in as trades are processed."
                />
              ) : (
                weeklyQ.data!.map((w) => (
                  <tr
                    key={`${w.weekStart}-${w.weekEnd}`}
                    className="hover:bg-zinc-900/40"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-zinc-300">
                      {w.weekStart}
                      <span className="text-zinc-600"> → </span>
                      {w.weekEnd}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-zinc-300">
                      {w.totalTrades}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-emerald-400">
                      {w.tradesCopied}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-zinc-400">
                      {w.tradesSkipped}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-red-400">
                      {w.tradesFailed}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-zinc-200">
                      {w.copyRatePercent}%
                    </td>
                    <td className="px-4 py-3 tabular-nums text-zinc-400">
                      {w.byWallet?.length ?? 0}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Expand current week by-wallet if any */}
        {weeklyQ.data?.[0]?.byWallet &&
        weeklyQ.data[0].byWallet.length > 0 ? (
          <div className="mt-3 rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4">
            <div className="mb-2 text-xs font-medium text-zinc-500">
              This week by leader ({weeklyQ.data[0].weekStart} →{' '}
              {weeklyQ.data[0].weekEnd})
            </div>
            <div className="flex flex-wrap gap-2">
              {weeklyQ.data[0].byWallet.map((row) => (
                <div
                  key={row.wallet}
                  className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs"
                >
                  <div className="text-zinc-300">
                    {row.label || `${row.wallet.slice(0, 8)}…`}
                  </div>
                  <div className="mt-1 text-zinc-500">
                    <span className="text-emerald-400">{row.copied}</span> c ·{' '}
                    <span>{row.skipped}</span> s ·{' '}
                    <span className="text-red-400">{row.failed}</span> f
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {/* Recent activity */}
      <section className="mt-8">
        <SectionTitle
          title="Recent activity"
          subtitle="Latest signals from the copy engine."
        />
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-900/80 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Leader</th>
                <th className="px-4 py-3 font-medium">Side</th>
                <th className="px-4 py-3 font-medium">Size</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {(tradesQ.data ?? []).length === 0 ? (
                <EmptyRow
                  colSpan={6}
                  loading={tradesQ.isLoading}
                  message="No trades yet. Add leaders to start copying."
                />
              ) : (
                tradesQ.data!.map((t) => (
                  <tr key={t.id} className="hover:bg-zinc-900/40">
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                      {new Date(t.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-zinc-200">
                        {t.walletLabel || '—'}
                      </div>
                      <div className="font-mono text-[11px] text-zinc-500">
                        {t.wallet.slice(0, 8)}…
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-200">
                      {t.side}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-zinc-300">
                      {t.executedSize || t.size}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${statusTone(t.status)}`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-xs text-zinc-500">
                      {t.reason || '—'}
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
