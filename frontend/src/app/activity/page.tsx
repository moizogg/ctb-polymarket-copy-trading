'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { useVisibleRefetchInterval } from '@/hooks/use-visible-refetch';
import { LineChart, Filter } from 'lucide-react';

function statusTone(status: string) {
  if (status === 'COPIED')
    return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  if (status === 'SKIPPED')
    return 'bg-slate-800/60 text-slate-400 border-slate-700/50';
  if (status === 'FAILED')
    return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
  return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
}

export default function ActivityPage() {
  const [onlyCopied, setOnlyCopied] = useState(false);
  const interval = useVisibleRefetchInterval(4_000);

  const tradesQ = useQuery({
    queryKey: ['activity', onlyCopied],
    queryFn: () => api.dashboard.recentTrades(50, onlyCopied),
    refetchInterval: interval,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trade Activity Stream"
        description="Comprehensive real-time log of signals detected by the engine, execution outcomes, and latency telemetry."
        action={
          <label className="flex items-center gap-2 rounded-lg border border-[#1c202b] bg-[#11131a] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-[#181b26] cursor-pointer transition">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <input
              type="checkbox"
              checked={onlyCopied}
              onChange={(e) => setOnlyCopied(e.target.checked)}
              className="rounded border-slate-700 bg-black text-emerald-500 focus:ring-0"
            />
            <span>Only Show COPIED Trades</span>
          </label>
        }
      />

      <div className="saas-card overflow-hidden">
        <table className="saas-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Target Leader</th>
              <th>Side</th>
              <th>Size</th>
              <th>Price</th>
              <th>Status</th>
              <th>Latency</th>
              <th>Reason / Telemetry</th>
              <th>Chart</th>
            </tr>
          </thead>
          <tbody>
            {(tradesQ.data ?? []).length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-xs font-medium text-slate-500">
                  {tradesQ.isLoading ? 'Loading live stream log…' : 'No trade activity found.'}
                </td>
              </tr>
            ) : (
              tradesQ.data!.map((t) => (
                <tr key={t.id}>
                  <td className="whitespace-nowrap font-mono text-xs text-slate-400">
                    {new Date(t.createdAt).toLocaleString()}
                  </td>
                  <td>
                    <div className="font-bold text-slate-200">
                      {t.walletLabel || 'Unlabeled Leader'}
                    </div>
                    <div className="font-mono text-[11px] text-slate-500">
                      {t.wallet.slice(0, 10)}…
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
                  <td className="tabular-nums font-semibold text-slate-400">
                    {t.price != null ? `$${t.price}` : '—'}
                  </td>
                  <td>
                    <span
                      className={`inline-flex rounded border px-2.5 py-0.5 text-[11px] font-bold ${statusTone(
                        t.status,
                      )}`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="font-mono text-xs text-slate-400">
                    {t.latencyMs != null ? `${t.latencyMs} ms` : '—'}
                  </td>
                  <td className="max-w-[220px] truncate text-xs text-slate-400 font-mono">
                    {t.reason || '—'}
                  </td>
                  <td>
                    {t.tokenId ? (
                      <Link
                        href={`/charts?tokenId=${encodeURIComponent(t.tokenId)}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
                      >
                        <LineChart className="h-3.5 w-3.5" />
                        <span>Chart</span>
                      </Link>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
