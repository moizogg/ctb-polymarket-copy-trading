'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { PriceChart } from '@/components/price-chart';

const INTERVALS = [
  { id: '1h', label: '1H' },
  { id: '6h', label: '6H' },
  { id: '1d', label: '1D' },
  { id: '1w', label: '1W' },
  { id: '1m', label: '1M' },
  { id: 'max', label: 'ALL' },
] as const;

function ChartsInner() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('tokenId') || '';

  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [tokenId, setTokenId] = useState(tokenFromUrl);
  const [marketLabel, setMarketLabel] = useState('');
  const [interval, setIntervalRange] = useState<string>('1w');
  const [equityMode, setEquityMode] = useState<'copies' | 'notional' | 'signed'>(
    'copies',
  );

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (tokenFromUrl) setTokenId(tokenFromUrl);
  }, [tokenFromUrl]);

  const marketsQ = useQuery({
    queryKey: ['charts-markets', debouncedQ],
    queryFn: () => api.charts.searchMarkets(debouncedQ, 12),
  });

  const recentQ = useQuery({
    queryKey: ['charts-recent-tokens'],
    queryFn: () => api.charts.recentTokens(10),
  });

  const historyQ = useQuery({
    queryKey: ['price-history', tokenId, interval],
    queryFn: () => api.charts.priceHistory(tokenId, interval),
    enabled: !!tokenId,
  });

  const equityQ = useQuery({
    queryKey: ['bot-equity'],
    queryFn: () => api.charts.equity(),
    refetchInterval: 15_000,
  });

  const pricePoints = historyQ.data?.points ?? [];

  const equityPoints = useMemo(() => {
    const pts = equityQ.data?.points ?? [];
    return pts.map((p) => ({
      time: p.time,
      value:
        equityMode === 'copies'
          ? p.copies
          : equityMode === 'notional'
            ? p.notional
            : p.signedNotional,
    }));
  }, [equityQ.data, equityMode]);

  return (
    <div>
      <PageHeader
        title="Charts"
        description="Market prices (Polymarket CLOB) and bot copy performance from your trade log."
      />

      <section className="mb-10">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium text-zinc-300">Market price</h2>
            <p className="text-xs text-zinc-600">
              {marketLabel ||
                (tokenId
                  ? `Token ${tokenId.slice(0, 12)}…`
                  : 'Pick a market below')}
            </p>
          </div>
          <div className="flex flex-wrap gap-1">
            {INTERVALS.map((iv) => (
              <button
                key={iv.id}
                type="button"
                onClick={() => setIntervalRange(iv.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                  interval === iv.id
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
                }`}
              >
                {iv.label}
              </button>
            ))}
          </div>
        </div>

        {historyQ.isError ? (
          <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {(historyQ.error as Error).message}
          </div>
        ) : null}

        {tokenId ? (
          pricePoints.length ? (
            <PriceChart points={pricePoints} height={340} />
          ) : (
            <div className="flex h-[340px] items-center justify-center rounded-xl border border-zinc-800 text-sm text-zinc-500">
              {historyQ.isLoading
                ? 'Loading price history…'
                : 'No history for this range.'}
            </div>
          )
        ) : (
          <div className="flex h-[340px] items-center justify-center rounded-xl border border-dashed border-zinc-700 text-sm text-zinc-500">
            Select a market to load the chart
          </div>
        )}

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 p-4">
            <label className="text-xs text-zinc-500">
              Search markets
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="e.g. trump, bitcoin, election…"
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500/40"
              />
            </label>
            <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto">
              {marketsQ.isLoading ? (
                <li className="text-xs text-zinc-500">Loading markets…</li>
              ) : (marketsQ.data ?? []).length === 0 ? (
                <li className="text-xs text-zinc-500">No markets found.</li>
              ) : (
                marketsQ.data!.map((m) => (
                  <li key={String(m.id || m.slug)}>
                    <button
                      type="button"
                      className="w-full rounded-lg px-2 py-2 text-left hover:bg-zinc-900"
                      onClick={() => {
                        const yes = m.yesTokenId || m.outcomes?.[0]?.tokenId;
                        if (yes) {
                          setTokenId(yes);
                          setMarketLabel(
                            `${m.question}${m.outcomes?.[0]?.name ? ` · ${m.outcomes[0].name}` : ''}`,
                          );
                        }
                      }}
                    >
                      <div className="line-clamp-2 text-sm text-zinc-200">
                        {m.question}
                      </div>
                      <div className="mt-0.5 flex flex-wrap gap-2 text-[11px] text-zinc-500">
                        {m.outcomes?.slice(0, 2).map((o) => (
                          <span key={o.tokenId || o.name}>
                            {o.name}
                            {o.price != null ? ` ${o.price}` : ''}
                          </span>
                        ))}
                      </div>
                    </button>
                    {m.outcomes && m.outcomes.length > 1 ? (
                      <div className="mb-1 ml-2 flex flex-wrap gap-1">
                        {m.outcomes.map((o) =>
                          o.tokenId ? (
                            <button
                              key={o.tokenId}
                              type="button"
                              className="rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-400 hover:border-emerald-500/40 hover:text-emerald-400"
                              onClick={() => {
                                setTokenId(o.tokenId);
                                setMarketLabel(`${m.question} · ${o.name}`);
                              }}
                            >
                              Chart {o.name}
                            </button>
                          ) : null,
                        )}
                      </div>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="rounded-xl border border-zinc-800 p-4">
            <div className="text-xs font-medium text-zinc-500">
              From bot trade log
            </div>
            <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto">
              {(recentQ.data ?? []).length === 0 ? (
                <li className="text-xs text-zinc-500">
                  No tokens from trades yet. After the bot logs activity, pick
                  them here for one-click charts.
                </li>
              ) : (
                recentQ.data!.map((r) => (
                  <li key={r.tokenId}>
                    <button
                      type="button"
                      className="w-full rounded-lg px-2 py-2 text-left hover:bg-zinc-900"
                      onClick={() => {
                        setTokenId(r.tokenId);
                        setMarketLabel(r.slug || `${r.tokenId.slice(0, 16)}…`);
                      }}
                    >
                      <div className="text-sm text-zinc-200">
                        {r.slug || 'Market token'}
                      </div>
                      <div className="font-mono text-[11px] text-zinc-500">
                        {r.side} · {r.tokenId.slice(0, 18)}…
                      </div>
                    </button>
                  </li>
                ))
              )}
            </ul>
            <label className="mt-3 block text-xs text-zinc-500">
              Or paste token id
              <input
                value={tokenId}
                onChange={(e) => {
                  setTokenId(e.target.value.trim());
                  setMarketLabel('');
                }}
                placeholder="CLOB token id"
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100 outline-none focus:border-emerald-500/40"
              />
            </label>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium text-zinc-300">
              Bot performance
            </h2>
            <p className="text-xs text-zinc-600">
              Built from COPIED trades in your database.
              {equityQ.data
                ? ` · ${equityQ.data.totalCopied} copies total`
                : ''}
            </p>
          </div>
          <div className="flex gap-1">
            {(
              [
                ['copies', 'Copies'],
                ['notional', 'Notional'],
                ['signed', 'Cash proxy'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setEquityMode(id)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                  equityMode === id
                    ? 'bg-sky-500/15 text-sky-400'
                    : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {equityQ.data?.note ? (
          <p className="mb-2 text-[11px] text-zinc-600">{equityQ.data.note}</p>
        ) : null}

        {equityPoints.length ? (
          <PriceChart points={equityPoints} height={280} lineColor="#38bdf8" />
        ) : (
          <div className="flex h-[280px] items-center justify-center rounded-xl border border-zinc-800 text-sm text-zinc-500">
            {equityQ.isLoading
              ? 'Loading equity…'
              : 'No COPIED trades yet — curve fills as the bot copies leaders.'}
          </div>
        )}
      </section>
    </div>
  );
}

export default function ChartsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-zinc-500">Loading charts…</div>
      }
    >
      <ChartsInner />
    </Suspense>
  );
}
