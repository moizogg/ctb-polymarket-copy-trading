'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { Bell, ShieldAlert, AlertTriangle, CheckCircle, CheckCheck } from 'lucide-react';

function severityBadge(s: string) {
  if (s === 'CRITICAL')
    return {
      bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      icon: ShieldAlert,
    };
  if (s === 'WARNING')
    return {
      bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      icon: AlertTriangle,
    };
  return {
    bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    icon: Bell,
  };
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
    <div className="space-y-6">
      <PageHeader
        title="Critical Alerts & System Events"
        description="Real-time execution failures, latency spikes, and bot performance notifications."
        action={
          <button
            type="button"
            onClick={() => markAll.mutate()}
            className="flex items-center gap-1.5 rounded-lg border border-[#1c202b] bg-[#11131a] px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-[#181b26] transition cursor-pointer"
          >
            <CheckCheck className="h-4 w-4 text-emerald-400" />
            <span>Mark All Read</span>
          </button>
        }
      />

      <div className="space-y-3">
        {(listQ.data ?? []).length === 0 ? (
          <div className="saas-card p-12 text-center text-xs font-medium text-slate-500">
            {listQ.isLoading ? 'Loading alerts feed…' : 'No alerts recorded. All system parameters are operating normally.'}
          </div>
        ) : (
          listQ.data!.map((a) => {
            const badge = severityBadge(a.severity);
            const Icon = badge.icon;

            return (
              <div
                key={a.id}
                className={`saas-card p-4 transition ${
                  a.read ? 'opacity-50' : 'border-l-4 border-l-rose-500'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg border ${badge.bg}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded border px-2 py-0.5 text-[10px] font-bold ${badge.bg}`}
                        >
                          {a.severity}
                        </span>
                        <span className="text-xs font-mono font-semibold text-slate-400">
                          {a.type}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-bold text-slate-200">{a.message}</p>
                      <p className="mt-1 font-mono text-[11px] text-slate-500">
                        {new Date(a.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {!a.read ? (
                    <button
                      type="button"
                      className="flex items-center gap-1 rounded border border-[#1c202b] bg-[#0c0e13] px-2.5 py-1 text-xs font-semibold text-emerald-400 hover:bg-[#151821] transition cursor-pointer"
                      onClick={() => markOne.mutate(a.id)}
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>Mark Read</span>
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
