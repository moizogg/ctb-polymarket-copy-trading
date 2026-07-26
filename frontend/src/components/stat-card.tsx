import { ReactNode } from 'react';

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'default',
  badge,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  tone?: 'default' | 'good' | 'bad' | 'warn' | 'info';
  badge?: string;
}) {
  const toneClass =
    tone === 'good'
      ? 'text-emerald-400'
      : tone === 'bad'
        ? 'text-rose-400'
        : tone === 'warn'
          ? 'text-amber-400'
          : tone === 'info'
            ? 'text-blue-400'
            : 'text-slate-100';

  const iconBg =
    tone === 'good'
      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      : tone === 'bad'
        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
        : tone === 'warn'
          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          : tone === 'info'
            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
            : 'bg-slate-800/50 text-slate-400 border-slate-700/30';

  return (
    <div className="saas-card relative overflow-hidden p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </span>
        {icon ? (
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${iconBg}`}>
            {icon}
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <div className={`text-2xl font-bold tracking-tight tabular-nums ${toneClass}`}>
          {value}
        </div>
        {badge ? (
          <span className="rounded border border-slate-800 bg-slate-900 px-2 py-0.5 text-[11px] font-medium text-slate-300">
            {badge}
          </span>
        ) : null}
      </div>

      {hint ? (
        <div className="mt-2 text-xs font-medium text-slate-400">
          {hint}
        </div>
      ) : null}
    </div>
  );
}
