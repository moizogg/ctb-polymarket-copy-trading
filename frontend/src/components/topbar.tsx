'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ConnectWallet } from '@/components/connect-wallet';
import { useVisibleRefetchInterval } from '@/hooks/use-visible-refetch';

function shortAddr(addr: string | null | undefined) {
  if (!addr) return '—';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatAgo(iso: string | null | undefined): string {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 'just now';
  if (ms < 5_000) return 'just now';
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  return new Date(iso).toLocaleTimeString();
}

export function Topbar() {
  const interval = useVisibleRefetchInterval(3_000);
  const {
    data: bot,
    isError,
    isFetching,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ['bot-status'],
    queryFn: () => api.bot.status(),
    refetchInterval: interval,
  });

  const running = bot?.copyTradingEnabled ?? false;
  const pollStale =
    bot?.lastPollAt != null &&
    Date.now() - new Date(bot.lastPollAt).getTime() > 15_000;

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-zinc-800 bg-zinc-950/80 px-5 backdrop-blur">
      <div className="flex min-w-0 flex-wrap items-center gap-3 text-xs">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium ${
            isError
              ? 'border-red-500/30 bg-red-500/10 text-red-400'
              : running
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
          }`}
          title={bot?.pauseReason || undefined}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isError
                ? 'bg-red-400'
                : running
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-amber-400'
            }`}
          />
          {isError
            ? 'API offline'
            : running
              ? 'Bot running'
              : 'Bot paused'}
        </span>

        {!isError && bot?.lastPollAt ? (
          <span
            className={`hidden sm:inline ${
              !bot.lastPollOk || pollStale
                ? 'text-amber-500'
                : 'text-zinc-500'
            }`}
            title={
              bot.lastPollError ||
              `Last poll ${bot.lastPollAt} · ${bot.activeLeadersPolled} leaders`
            }
          >
            Poll {formatAgo(bot.lastPollAt)}
            {!bot.lastPollOk ? ' · error' : ''}
            {pollStale ? ' · stale' : ''}
          </span>
        ) : null}

        <span className="hidden text-zinc-500 md:inline">
          Trading as{' '}
          <span className="font-mono text-zinc-300">
            {shortAddr(bot?.executionAddress) === '—'
              ? 'set FUNDER_ADDRESS'
              : shortAddr(bot?.executionAddress)}
          </span>
        </span>

        <span
          className="hidden text-zinc-600 lg:inline"
          title={
            dataUpdatedAt
              ? new Date(dataUpdatedAt).toLocaleString()
              : undefined
          }
        >
          Updated {dataUpdatedAt ? formatAgo(new Date(dataUpdatedAt).toISOString()) : '—'}
          {isFetching ? ' · sync…' : ''}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <ConnectWallet />
      </div>
    </header>
  );
}
