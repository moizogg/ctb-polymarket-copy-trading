'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ConnectWallet } from '@/components/connect-wallet';
import { useVisibleRefetchInterval } from '@/hooks/use-visible-refetch';
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  Activity,
  Wallet,
  RefreshCw,
  Power,
} from 'lucide-react';

function shortAddr(addr: string | null | undefined) {
  if (!addr) return 'Not Configured';
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
  const queryClient = useQueryClient();
  const [togglePending, setTogglePending] = useState(false);
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

  const toggleMutation = useMutation({
    mutationFn: (enable: boolean) =>
      enable ? api.bot.resume() : api.bot.pause('Manual Kill-Switch Toggle'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bot-status'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setTogglePending(false);
    },
    onError: () => {
      setTogglePending(false);
    },
  });

  const running = bot?.copyTradingEnabled ?? false;
  const pollStale =
    bot?.lastPollAt != null &&
    Date.now() - new Date(bot.lastPollAt).getTime() > 15_000;

  const handleToggle = () => {
    setTogglePending(true);
    toggleMutation.mutate(!running);
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-[#1c202b] bg-[#090b10]/90 px-6 backdrop-blur">
      {/* Left System Indicators */}
      <div className="flex items-center gap-4 text-xs">
        {/* Emergency Kill-Switch Toggle Pill */}
        <button
          onClick={handleToggle}
          disabled={togglePending || isError}
          title={
            running
              ? 'Click to activate Kill-Switch and PAUSE all copy-trading operations'
              : 'Click to DISABLE Kill-Switch and RESUME live copy-trading'
          }
          className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 font-bold transition-all cursor-pointer ${
            isError
              ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
              : running
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                : 'border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
          }`}
        >
          <Power
            className={`h-3.5 w-3.5 ${
              running ? 'text-emerald-400' : 'text-amber-400'
            } ${togglePending ? 'animate-spin' : ''}`}
          />
          <span>
            {isError
              ? 'API Offline'
              : running
                ? 'LIVE TRADING ACTIVE'
                : 'KILL-SWITCH ACTIVE (PAUSED)'}
          </span>
          <span className="ml-1 rounded bg-black/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-slate-400">
            {running ? 'Pause' : 'Resume'}
          </span>
        </button>

        {/* Polling Health Indicator */}
        {!isError && bot?.lastPollAt ? (
          <div
            className={`hidden items-center gap-1.5 rounded-md border border-[#1c202b] bg-[#0f1118] px-2.5 py-1 text-slate-400 sm:flex ${
              !bot.lastPollOk || pollStale ? 'text-amber-400' : ''
            }`}
          >
            <Activity className="h-3.5 w-3.5 text-slate-500" />
            <span>Poll {formatAgo(bot.lastPollAt)}</span>
            {pollStale ? (
              <span className="font-semibold text-amber-400">· Stale</span>
            ) : null}
          </div>
        ) : null}

        {/* Dynamic Funder Wallet */}
        <div className="hidden items-center gap-2 rounded-md border border-[#1c202b] bg-[#0f1118] px-2.5 py-1 text-slate-400 md:flex">
          <Wallet className="h-3.5 w-3.5 text-slate-500" />
          <span>Funder:</span>
          <span className="font-mono font-medium text-slate-200">
            {shortAddr(bot?.executionAddress)}
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex shrink-0 items-center gap-3">
        {/* Refetch Indicator */}
        <div className="hidden text-[11px] font-medium text-slate-500 lg:flex items-center gap-1">
          <RefreshCw
            className={`h-3 w-3 text-slate-500 ${
              isFetching ? 'animate-spin text-emerald-400' : ''
            }`}
          />
          <span>
            {dataUpdatedAt
              ? `Sync ${formatAgo(new Date(dataUpdatedAt).toISOString())}`
              : 'Syncing…'}
          </span>
        </div>

        <ConnectWallet />
      </div>
    </header>
  );
}
