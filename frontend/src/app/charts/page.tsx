'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { PriceChart } from '@/components/price-chart';
import { LineChart, Search, TrendingUp, Layers } from 'lucide-react';

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
    <div className="space-y-8">
      <PageHeader
        title="Market & Equity Analytics"
        description="Polymarket order book token prices and internal bot performance curves."
      />

      {/* Market Price Chart Section */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <LineChart className="h-5 w-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-bold text-slate-100">Market Price Action</h2>
              <p className="text-xs text-slate-400 font-mono">
                {marketLabel ||
                  (tokenId
                    ? `Token ${tokenId.slice(0, 14)}…`
                    : 'Select a market below to load candlestick data')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1 rounded-lg border border-[#1c202b] bg-[#0c0e13] p-1">
            {INTERVALS.map((iv) => (
              <button
                key={iv.id}
                type="button"
                onClick={() => setIntervalRange(iv.id)}
                className={`rounded px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                  interval === iv.id
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {iv.label}
              </button>
            ))}
          </div>
        </div>

        {historyQ.isError ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-300">
            {(historyQ.error as Error).message}
          </div>
        ) : null}

        <div className="saas-card overflow-hidden p-4">
          {tokenId ? (
            pricePoints.length ? (
              <PriceChart points={pricePoints} height={360} />
            ) : (
              <div className="flex h-[360px] items-center justify-center text-xs font-medium text-slate-500">
                {historyQ.isLoading
                  ? 'Loading market candles from Polymarket CLOB…'
                  : 'No price history points available for this range.'}
              </div>
            )
          ) : (
            <div className="flex h-[360px] flex-col items-center justify-center text-xs font-medium text-slate-500 border border-dashed border-[#1c202b] rounded-xl">
              <Search className="h-8 w-8 text-slate-600 mb-2" />
              <span>Search or pick a market token below to load interactive chart</span>
            </div>
          )}
        </div>

        {/* Market Search & Recent Tokens Grid */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="saas-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Search className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Search Polymarket Catalogs
              </span>
            </div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search e.g. Bitcoin, Election, Fed rate…"
              className="w-full rounded-lg border border-[#1c202b] bg-[#0c0e13] px-3.5 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none focus:border-emerald-500/50 transition mb-3"
            />
            <ul className="max-h-60 space-y-1 overflow-y-auto pr-1">
              {marketsQ.isLoading ? (
                <li className="text-xs text-slate-500">Searching Polymarket API…</li>
              ) : (marketsQ.data ?? []).length === 0 ? (
                <li className="text-xs text-slate-500">No matching markets found.</li>
              ) : (
                marketsQ.data!.map((m) => (
                  <li key={String(m.id || m.slug)}>
                    <button
                      type="button"
                      className="w-full rounded-lg p-2.5 text-left hover:bg-[#151821] border border-transparent hover:border-[#1c202b] transition cursor-pointer"
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
                      <div className="line-clamp-2 text-xs font-bold text-slate-200">
                        {m.question}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-500 font-mono">
                        {m.outcomes?.slice(0, 2).map((o) => (
                          <span key={o.tokenId || o.name}>
                            {o.name}
                            {o.price != null ? ` ($${o.price})` : ''}
                          </span>
                        ))}
                      </div>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="saas-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Recent Bot Trade Tokens
              </span>
            </div>
            <ul className="max-h-60 space-y-1 overflow-y-auto pr-1">
              {(recentQ.data ?? []).length === 0 ? (
                <li className="text-xs text-slate-500">
                  No traded tokens recorded yet. After the bot copies signals, tokens appear here.
                </li>
              ) : (
                recentQ.data!.map((r) => (
                  <li key={r.tokenId}>
                    <button
                      type="button"
                      className="w-full rounded-lg p-2.5 text-left hover:bg-[#151821] border border-transparent hover:border-[#1c202b] transition cursor-pointer"
                      onClick={() => {
                        setTokenId(r.tokenId);
                        setMarketLabel(r.slug || `${r.tokenId.slice(0, 16)}…`);
                      }}
                    >
                      <div className="text-xs font-bold text-slate-200">
                        {r.slug || 'Market Token'}
                      </div>
                      <div className="font-mono text-[11px] text-slate-500">
                        {r.side} · {r.tokenId.slice(0, 20)}…
                      </div>
                    </button>
                  </li>
                ))
              )}
            </ul>

            <div className="mt-4 border-t border-[#1c202b] pt-3">
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Direct Token ID Override
              </label>
              <input
                value={tokenId}
                onChange={(e) => {
                  setTokenId(e.target.value.trim());
                  setMarketLabel('');
                }}
                placeholder="Paste CLOB Token ID string"
                className="w-full rounded-lg border border-[#1c202b] bg-[#0c0e13] px-3 py-2 font-mono text-xs text-slate-100 placeholder-slate-600 outline-none focus:border-emerald-500/50 transition"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Bot Equity & Copy Performance Curve */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Bot Equity Growth Curve
              </h2>
              <p className="text-xs text-slate-400">
                Cumulative curve generated from executed COPIED trades.
              </p>
            </div>
          </div>

          <div className="flex gap-1 rounded-lg border border-[#1c202b] bg-[#0c0e13] p-1">
            {(
              [
                ['copies', 'Copies Count'],
                ['notional', 'Gross Volume ($)'],
                ['signed', 'Net Cash Proxy ($)'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setEquityMode(id)}
                className={`rounded px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                  equityMode === id
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="saas-card overflow-hidden p-4">
          {equityPoints.length ? (
            <PriceChart points={equityPoints} height={300} lineColor="#10b981" />
          ) : (
            <div className="flex h-[300px] items-center justify-center text-xs font-medium text-slate-500">
              {equityQ.isLoading
                ? 'Calculating equity trajectory…'
                : 'No COPIED trades recorded yet — performance curve will populate automatically as trades copy.'}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function ChartsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs font-medium text-slate-500">
          Initializing analytics charts…
        </div>
      }
    >
      <ChartsInner />
    </Suspense>
  );
}
