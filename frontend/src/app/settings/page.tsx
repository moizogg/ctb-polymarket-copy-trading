'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { api, API_URL } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import {
  Settings,
  Zap,
  Shield,
  Wallet,
  Server,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Lock,
} from 'lucide-react';

export default function SettingsPage() {
  const qc = useQueryClient();
  const { address, isConnected, connector } = useAccount();

  const botQ = useQuery({
    queryKey: ['bot-status'],
    queryFn: () => api.bot.status(),
    refetchInterval: 5_000,
  });

  const linkedQ = useQuery({
    queryKey: ['operator-wallets'],
    queryFn: () => api.operator.list(),
    refetchInterval: 10_000,
  });

  const pauseMut = useMutation({
    mutationFn: () => api.bot.pause('Paused from settings dashboard'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bot-status'] }),
  });

  const resumeMut = useMutation({
    mutationFn: () => api.bot.resume(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bot-status'] }),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => api.operator.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['operator-wallets'] }),
  });

  const running = botQ.data?.copyTradingEnabled;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings & System Control"
        description="Configure bot kill-switch, execution wallet credentials, operator links, and backend API connection."
      />

      {/* Copy Trading Emergency Controls */}
      <div className="saas-card p-6">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-5 w-5 text-emerald-400" />
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
            Copy-Trading Engine Safety Control
          </h2>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
          Pausing stops order placement on Polymarket. The poller continues to run safely in logging-only mode. Disconnecting your web wallet will <strong>not</strong> interrupt the background backend.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <span
            className={`inline-flex items-center gap-1.5 rounded border px-3 py-1 text-xs font-bold ${
              running
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                running ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span>{running ? 'ENGINE RUNNING (LIVE)' : 'PAUSED (KILL SWITCH ACTIVE)'}</span>
          </span>

          {botQ.data?.pauseReason ? (
            <span className="text-xs font-medium text-slate-400 italic">
              Reason: {botQ.data.pauseReason}
            </span>
          ) : null}

          {running ? (
            <button
              type="button"
              disabled={pauseMut.isPending}
              onClick={() => pauseMut.mutate()}
              className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50 transition cursor-pointer"
            >
              {pauseMut.isPending ? 'Pausing…' : 'Activate Kill Switch (Pause)'}
            </button>
          ) : (
            <button
              type="button"
              disabled={resumeMut.isPending}
              onClick={() => resumeMut.mutate()}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50 transition cursor-pointer"
            >
              {resumeMut.isPending ? 'Resuming…' : 'Resume Live Copy Trading'}
            </button>
          )}
        </div>
      </div>

      {/* Connected Web3 Wallet Setup */}
      <div className="saas-card p-6">
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="h-5 w-5 text-emerald-400" />
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
            Execution Wallet Link
          </h2>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
          Connect your Web3 wallet (MetaMask / Rabby / Trust) on Polygon. Clicking the button below sets your trading proxy automatically without exporting private keys.
        </p>

        <div className="mt-4 rounded-lg bg-[#0c0e13] border border-[#1c202b] p-4 space-y-2 font-mono text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Connection Status:</span>
            <span className={isConnected ? 'font-bold text-emerald-400' : 'text-slate-400'}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Active Wallet Address:</span>
            <span className="font-bold text-slate-200">{address || 'Not Connected'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Wallet Extension Connector:</span>
            <span className="text-slate-300">{connector?.name || 'None'}</span>
          </div>
        </div>

        {isConnected && address ? (
          <div className="mt-5 border-t border-[#1c202b] pt-4">
            <button
              type="button"
              onClick={async () => {
                try {
                  const resolved = await api.polymarket.proxyWallet(address);
                  const funder = resolved.proxyWallet || address;
                  await api.bot.saveConfig({ funderAddress: funder });
                  qc.invalidateQueries({ queryKey: ['bot-status'] });
                  alert(`Execution wallet set to ${funder}! Turn off the Kill Switch above when you are ready to copy trade.`);
                } catch (err: unknown) {
                  const msg = err instanceof Error ? err.message : String(err);
                  alert(`Failed linking execution wallet: ${msg}`);
                }
              }}
              className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition cursor-pointer shadow-sm"
            >
              <Zap className="h-4 w-4" />
              <span>Link Connected Wallet for Live Trading</span>
            </button>
          </div>
        ) : null}
      </div>

      {/* Linked Operators & API Details Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="saas-card p-6">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-5 w-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Linked Operator Accounts
            </h2>
          </div>
          <ul className="space-y-2">
            {(linkedQ.data ?? []).length === 0 ? (
              <li className="text-xs text-slate-500">
                No linked operator wallets. Connect your wallet above to link.
              </li>
            ) : (
              linkedQ.data!.map((w) => (
                <li
                  key={w.id}
                  className="flex items-center justify-between rounded-lg border border-[#1c202b] bg-[#0c0e13] p-3 text-xs"
                >
                  <div>
                    <div className="font-mono font-bold text-slate-200">
                      {w.address}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {w.label || 'Operator Wallet'}
                      {w.isPrimary ? ' · Primary' : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="text-xs font-semibold text-rose-400 hover:underline cursor-pointer"
                    onClick={() => removeMut.mutate(w.id)}
                  >
                    Unlink
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="saas-card p-6">
          <div className="flex items-center gap-2 mb-3">
            <Server className="h-5 w-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Backend Endpoint Telemetry
            </h2>
          </div>
          <div className="space-y-3 text-xs">
            <div>
              <div className="text-[11px] font-semibold text-slate-400">Railway API Host</div>
              <div className="mt-1 font-mono font-bold text-emerald-400 rounded bg-[#0c0e13] border border-[#1c202b] p-2 truncate">
                {API_URL}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-400">Registered Backend Funder</div>
              <div className="mt-1 font-mono font-bold text-slate-200 rounded bg-[#0c0e13] border border-[#1c202b] p-2 truncate">
                {botQ.data?.executionAddress || 'Not set in backend'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
