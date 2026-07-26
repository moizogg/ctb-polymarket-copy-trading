'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/page-header';

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
    <div>
      <PageHeader
        title="Leaders"
        description="Wallets you copy on Polymarket. They never connect — you only add their addresses."
      />

      <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <h2 className="mb-3 text-sm font-medium text-zinc-300">Add leader</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-xs text-zinc-500">
            Wallet address (0x…)
            <input
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              placeholder="0x…"
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500/50"
            />
          </label>
          <label className="block text-xs text-zinc-500">
            Or Polymarket username
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="@trader"
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500/50"
            />
          </label>
          <label className="block text-xs text-zinc-500 md:col-span-2">
            Label (optional)
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Alpha leader"
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500/50"
            />
          </label>
        </div>
        {formError ? (
          <p className="mt-2 text-sm text-red-400">{formError}</p>
        ) : null}
        <button
          type="button"
          disabled={addMut.isPending}
          onClick={() => addMut.mutate()}
          className="mt-3 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
        >
          {addMut.isPending ? 'Adding…' : 'Add leader'}
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900/80 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Label</th>
              <th className="px-4 py-3 font-medium">Wallet</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Cursor</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/80">
            {(listQ.data ?? []).length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-zinc-500">
                  {listQ.isLoading ? 'Loading…' : 'No leaders yet.'}
                </td>
              </tr>
            ) : (
              listQ.data!.map((w) => (
                <tr key={w.id} className="hover:bg-zinc-900/40">
                  <td className="px-4 py-3 text-zinc-200">
                    {w.label || '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                    {w.wallet}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                        w.isActive
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-zinc-500/10 text-zinc-400'
                      }`}
                    >
                      {w.isActive ? 'Active' : 'Paused'}
                    </span>
                  </td>
                  <td className="max-w-[140px] truncate px-4 py-3 font-mono text-[11px] text-zinc-500">
                    {w.lastTradeId || 'not set'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
                        onClick={() =>
                          toggleMut.mutate({
                            id: w.id,
                            isActive: !w.isActive,
                          })
                        }
                      >
                        {w.isActive ? 'Pause' : 'Resume'}
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-red-500/30 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10"
                        onClick={() => {
                          if (confirm('Remove this leader?')) {
                            removeMut.mutate(w.id);
                          }
                        }}
                      >
                        Remove
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
