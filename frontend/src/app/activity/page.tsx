'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { useVisibleRefetchInterval } from '@/hooks/use-visible-refetch';

export default function ActivityPage() {
  const [onlyCopied, setOnlyCopied] = useState(false);
  const interval = useVisibleRefetchInterval(4_000);

  const tradesQ = useQuery({
    queryKey: ['activity', onlyCopied],
    queryFn: () => api.dashboard.recentTrades(50, onlyCopied),
    refetchInterval: interval,
  });

  return (
    <div>
      <PageHeader
        title="Activity"
        description="Full trade log from the copy engine."
        action={
          <label className="flex items-center gap-2 text-sm text-zinc-400">
            <input
              type="checkbox"
              checked={onlyCopied}
              onChange={(e) => setOnlyCopied(e.target.checked)}
              className="rounded border-zinc-600"
            />
            Only COPIED
          </label>
        }
      />

      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900/80 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium">Leader</th>
              <th className="px-4 py-3 font-medium">Side</th>
              <th className="px-4 py-3 font-medium">Size</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Latency</th>
              <th className="px-4 py-3 font-medium">Reason</th>
              <th className="px-4 py-3 font-medium">Chart</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/80">
            {(tradesQ.data ?? []).length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-zinc-500">
                  {tradesQ.isLoading ? 'Loading…' : 'No activity yet.'}
                </td>
              </tr>
            ) : (
              tradesQ.data!.map((t) => (
                <tr key={t.id} className="hover:bg-zinc-900/40">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-zinc-500">
                    {new Date(t.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-zinc-200">
                    {t.walletLabel || t.wallet.slice(0, 10) + '…'}
                  </td>
                  <td className="px-4 py-3">{t.side}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {t.executedSize || t.size}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-zinc-400">
                    {t.price}
                  </td>
                  <td className="px-4 py-3 text-xs font-medium">{t.status}</td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                    {t.latencyMs != null ? `${t.latencyMs}ms` : '—'}
                  </td>
                  <td className="max-w-[180px] truncate px-4 py-3 text-xs text-zinc-500">
                    {t.reason || '—'}
                  </td>
                  <td className="px-4 py-3">
                    {t.tokenId ? (
                      <Link
                        href={`/charts?tokenId=${encodeURIComponent(t.tokenId)}`}
                        className="text-xs text-emerald-400 hover:underline"
                      >
                        Open
                      </Link>
                    ) : (
                      '—'
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
