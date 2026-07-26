'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/', label: 'Dashboard', icon: '◈' },
  { href: '/stats', label: 'Detailed Stats', icon: '📊' },
  { href: '/leaders', label: 'Leaders', icon: '◎' },
  { href: '/activity', label: 'Activity', icon: '⇄' },
  { href: '/portfolio', label: 'Portfolio', icon: '▣' },
  { href: '/charts', label: 'Charts', icon: '◔' },
  { href: '/alerts', label: 'Alerts', icon: '◉' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="border-b border-zinc-800 px-5 py-5">
        <div className="text-xs font-medium tracking-widest text-emerald-500">
          CTB
        </div>
        <div className="mt-0.5 text-sm font-semibold text-zinc-100">
          Copy Trading
        </div>
        <div className="mt-1 text-[11px] text-zinc-500">Operator console</div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {NAV.map((item) => {
          const active =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                active
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'
              }`}
            >
              <span className="w-4 text-center text-xs opacity-70">
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-800 p-4 text-[11px] leading-relaxed text-zinc-600">
        Backend API · Polygon · Polymarket
      </div>
    </aside>
  );
}
