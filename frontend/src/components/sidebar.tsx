'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Activity,
  Briefcase,
  LineChart,
  Bell,
  Settings,
  Shield,
  Zap,
} from 'lucide-react';

const NAV_GROUPS = [
  {
    title: 'Core System',
    items: [
      { href: '/', label: 'Overview', icon: LayoutDashboard },
      { href: '/leaders', label: 'Leader Wallets', icon: Users },
      { href: '/activity', label: 'Trade Stream', icon: Activity },
    ],
  },
  {
    title: 'Analytics & Risk',
    items: [
      { href: '/portfolio', label: 'Portfolio & Positions', icon: Briefcase },
      { href: '/charts', label: 'Market Charts', icon: LineChart },
      { href: '/alerts', label: 'Critical Alerts', icon: Bell },
    ],
  },
  {
    title: 'System Control',
    items: [
      { href: '/settings', label: 'Settings & Security', icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-[#1c202b] bg-[#0c0e13]">
      {/* Brand Header */}
      <div className="flex items-center gap-3 border-b border-[#1c202b] px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
          <Zap className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold tracking-tight text-slate-100">
              CTB Console
            </span>
            <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
              v2.0
            </span>
          </div>
          <p className="text-[11px] font-medium text-slate-500">
            Polymarket Copy-Engine
          </p>
        </div>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 space-y-6 overflow-y-auto p-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {group.title}
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all ${
                      active
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm'
                        : 'text-slate-400 hover:bg-[#151821] hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 transition-colors ${
                        active
                          ? 'text-emerald-400'
                          : 'text-slate-500 group-hover:text-slate-300'
                      }`}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Operator Footer Status */}
      <div className="border-t border-[#1c202b] p-4">
        <div className="flex items-center gap-2.5 rounded-lg border border-[#1c202b] bg-[#11131a] p-3 text-xs">
          <Shield className="h-4 w-4 text-emerald-400 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-medium text-slate-300">
              Polygon Mainnet
            </div>
            <div className="truncate text-[10px] text-slate-500">
              Dynamic L2 Credentials
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
