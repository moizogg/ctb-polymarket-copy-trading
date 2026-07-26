'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import {
  Plus,
  Trash2,
  Power,
  UserCheck,
  AlertCircle,
} from 'lucide-react';

export default function LeadersPage() {
  const qc = useQueryClient();
  const [wallet, setWallet] = useState('');
  const [label, setLabel] = useState('');
  const [username, setUsername] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const listQ = useQuery({
    queryKey: ['leaders'],
    queryFn: () => api.wallets.list(),
    refetchInterval: 5_000,
  });

  const addMut = useMutation({
    mutationFn: async () => {
      setFormError(null);
      let address = wallet.trim();
      if (!address && username.trim()) {
        const res = await api.polymarket.proxyWallet(
          username.trim().replace(/^@/, ''),
        );
        if (!res.proxyWallet) {
          throw new Error('Could not resolve username to proxy wallet');
        }
        address = res.proxyWallet;
      }
      if (!address) throw new Error('Enter a wallet address or username');
      return api.wallets.add(address, label.trim() || undefined);
    },
    onSuccess: () => {
      setWallet('');
      setLabel('');
      setUsername('');
      qc.invalidateQueries({ queryKey: ['leaders'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.wallets.update(id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leaders'] }),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => api.wallets.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leaders'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Leader Wallets"
        description="Track alpha traders on Polymarket. Addresses are polled via public activity logs — no leader connections needed."
      />

      {/* Add Leader Form Card */}
      <div className="saas-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <UserCheck className="h-5 w-5 text-emerald-400" />
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
            Add New Target Leader
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Wallet Address (0x…)
            </label>
            <input
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              placeholder="0x1234…abcd"
              className="w-full rounded-lg border border-[#1c202b] bg-[#0c0e13] px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-600 outline-none focus:border-emerald-500/50 font-mono transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Or Polymarket Username
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="@trader_alias"
              className="w-full rounded-lg border border-[#1c202b] bg-[#0c0e13] px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-600 outline-none focus:border-emerald-500/50 transition"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Custom Label (Optional)
            </label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Whale Alpha Trader #1"
              className="w-full rounded-lg border border-[#1c202b] bg-[#0c0e13] px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-600 outline-none focus:border-emerald-500/50 transition"
            />
          </div>
        </div>

        {formError ? (
          <div className="mt-3 flex items-center gap-2 text-xs font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{formError}</span>
          </div>
        ) : null}

        <button
          type="button"
          disabled={addMut.isPending}
          onClick={() => addMut.mutate()}
          className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50 transition cursor-pointer shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>{addMut.isPending ? 'Resolving & Adding…' : 'Add Leader Wallet'}</span>
        </button>
      </div>

      {/* Leaders List Table */}
      <div className="saas-card overflow-hidden">
        <table className="saas-table">
          <thead>
            <tr>
              <th>Leader Label</th>
              <th>Wallet Address</th>
              <th>Polling Status</th>
              <th>Last Trade Cursor</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(listQ.data ?? []).length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-xs font-medium text-slate-500">
                  {listQ.isLoading ? 'Loading leaders list…' : 'No leaders added yet. Add a trader address above to begin copying.'}
                </td>
              </tr>
            ) : (
              listQ.data!.map((w) => (
                <tr key={w.id}>
                  <td>
                    <div className="font-bold text-slate-200">
                      {w.label || 'Unlabeled Leader'}
                    </div>
                  </td>
                  <td>
                    <div className="font-mono text-xs text-slate-300">
                      {w.wallet}
                    </div>
                  </td>
                  <td>
                    <span
                      className={`inline-flex rounded border px-2.5 py-0.5 text-[11px] font-bold ${
                        w.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-slate-800/60 text-slate-400 border-slate-700/50'
                      }`}
                    >
                      {w.isActive ? 'Active Polling' : 'Paused'}
                    </span>
                  </td>
                  <td className="max-w-[160px] truncate font-mono text-xs text-slate-500">
                    {w.lastTradeId || 'None'}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="flex items-center gap-1 rounded border border-[#1c202b] bg-[#11131a] px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-[#181b26] transition cursor-pointer"
                        onClick={() =>
                          toggleMut.mutate({
                            id: w.id,
                            isActive: !w.isActive,
                          })
                        }
                      >
                        <Power className="h-3.5 w-3.5 text-slate-400" />
                        <span>{w.isActive ? 'Pause' : 'Resume'}</span>
                      </button>
                      <button
                        type="button"
                        className="flex items-center gap-1 rounded border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition cursor-pointer"
                        onClick={() => {
                          if (confirm('Remove this leader?')) {
                            removeMut.mutate(w.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
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
