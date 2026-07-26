'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/page-header';

function severityClass(s: string) {
  if (s === 'CRITICAL') return 'text-red-400 bg-red-500/10';
  if (s === 'WARNING') return 'text-amber-400 bg-amber-500/10';
  return 'text-sky-400 bg-sky-500/10';
}

export default function AlertsPage() {
  const qc = useQueryClient();
  const listQ = useQuery({
    queryKey: ['alerts'],
    queryFn: () => api.alerts.list(false),
    refetchInterval: 15_000,
  });

  const markAll = useMutation({
    mutationFn: () => api.alerts.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const markOne = useMutation({
    mutationFn: (id: string) => api.alerts.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });

  return (
    <div>
      <PageHeader
        title="Alerts"
        description="Performance warnings from the bot evaluator."
        action={
          <button
            type="button"
            onClick={() => markAll.mutate()}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            Mark all read
          </button>
        }
      />

      <ul className="space-y-2">
        {(listQ.data ?? []).length === 0 ? (
          <li className="rounded-xl border border-zinc-800 px-4 py-10 text-center text-sm text-zinc-500">
            {listQ.isLoading ? 'Loading…' : 'No alerts yet.'}
          </li>
        ) : (
          listQ.data!.map((a) => (
            <li
              key={a.id}
              className={`rounded-xl border border-zinc-800 px-4 py-3 ${
                a.read ? 'opacity-60' : 'bg-zinc-900/40'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span
                    className={`mr-2 inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${severityClass(a.severity)}`}
                  >
                    {a.severity}
                  </span>
                  <span className="text-xs text-zinc-500">{a.type}</span>
                  <p className="mt-1 text-sm text-zinc-200">{a.message}</p>
                  <p className="mt-1 font-mono text-[11px] text-zinc-600">
                    {new Date(a.createdAt).toLocaleString()}
                  </p>
                </div>
                {!a.read ? (
                  <button
                    type="button"
                    className="text-xs text-emerald-400 hover:underline"
                    onClick={() => markOne.mutate(a.id)}
                  >
                    Mark read
                  </button>
                ) : null}
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
