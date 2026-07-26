const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
).replace(/\/$/, '');

const API_KEY = process.env.NEXT_PUBLIC_API_KEY?.trim() || '';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (API_KEY) {
    headers.set('x-api-key', API_KEY);
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      cache: 'no-store',
    });
  } catch {
    // Browser "Failed to fetch" = backend down / CORS / wrong URL
    throw new ApiError(
      0,
      `Cannot reach backend at ${API_URL}. Start Nest: npm run start:dev (port 3000).`,
    );
  }

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.message || body.error || message;
      if (Array.isArray(message)) message = message.join(', ');
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, String(message));
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Types ──────────────────────────────────────────────

export interface BotStatus {
  copyTradingEnabled: boolean;
  pauseReason: string | null;
  executionAddress: string | null;
  updatedAt: string | null;
  pollIntervalMs: number;
  lastPollAt?: string | null;
  lastPollOk?: boolean;
  lastPollError?: string | null;
  activeLeadersPolled?: number;
  serverTime?: string;
}

export interface HealthResponse {
  ok: boolean;
  service: string;
  timestamp: string;
  database?: { ok: boolean; error: string | null };
  bot?: {
    copyTradingEnabled: boolean;
    lastPollAt: string | null;
    lastPollOk: boolean;
  };
}

export interface DashboardStats {
  walletsCount: number;
  activeWalletsCount: number;
  positionsCount: number;
  tradesCopied: number;
  tradesSkipped: number;
  tradesFailed: number;
  tradesPending: number;
  totalTrades: number;
  copyRatePercent: number;
  failRatePercent: number;
  lastCopyLatencyMs?: number | null;
  avgCopyLatencyMs?: number | null;
  lastFetchLatencyMs?: number | null;
  lastExecutionLatencyMs?: number | null;
  avgFetchLatencyMs?: number | null;
  avgExecutionLatencyMs?: number | null;
  tradesCopiedLast7Days: number;
}

export interface RecentTrade {
  id: string;
  tradeId: string;
  walletLabel: string | null;
  wallet: string;
  marketId: string;
  tokenId: string;
  slug?: string | null;
  side: string;
  size: string;
  executedSize?: string | null;
  price: string;
  status: string;
  reason?: string | null;
  createdAt: string;
  latencyMs?: number | null;
  fetchLatencyMs?: number | null;
  executionLatencyMs?: number | null;
}

export interface FollowedWallet {
  id: string;
  wallet: string;
  label?: string | null;
  isActive: boolean;
  lastTradeId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PerformanceAlert {
  id: string;
  type: string;
  severity: string;
  message: string;
  metadata?: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
}

export interface OperatorWallet {
  id: string;
  address: string;
  label?: string | null;
  isPrimary: boolean;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  tradesCopied: number;
  tradesSkipped: number;
  tradesFailed: number;
  totalTrades: number;
  copyRatePercent: number;
  byWallet: {
    wallet: string;
    label?: string | null;
    copied: number;
    skipped: number;
    failed: number;
  }[];
}

export interface LeaderComparison {
  wallet: string;
  label?: string | null;
  copied: number;
  skipped: number;
  failed: number;
  totalSignals: number;
  copyRatePercent: number;
  failRatePercent: number;
}

export interface ComparativeAnalysis {
  bot: {
    totalCopied: number;
    totalSkipped: number;
    totalFailed: number;
    copyRatePercent: number;
  };
  leaders: LeaderComparison[];
}

export interface PortfolioPosition {
  tokenId: string;
  marketId: string;
  title: string;
  slug: string;
  outcome: string;
  size: number;
  avgPrice: number;
  curPrice: number;
  currentValue: number;
  cashPnl: number;
  percentPnl: number;
  realizedPnl: number;
  localNetSize: number | null;
}

export interface PortfolioResponse {
  source: 'bot' | 'wallet';
  address: string | null;
  asOf: string;
  summary: {
    positionCount: number;
    totalCurrentValue: number;
    totalCashPnl: number;
    totalRealizedPnl: number;
    localTrackedCount: number;
  };
  positions: PortfolioPosition[];
  localPositions: {
    marketId: string;
    tokenId: string;
    netSize: string;
    updatedAt: string;
  }[];
  collateral: {
    available: boolean;
    balance: string | null;
    allowance: string | null;
    note: string;
  };
  warnings: string[];
}

// ── API surface ────────────────────────────────────────

export const api = {
  health: () => request<HealthResponse>('/health'),

  bot: {
    status: () => request<BotStatus>('/bot/status'),
    saveConfig: (data: { funderAddress: string; apiCreds?: any }) =>
      request<BotStatus>('/bot/config', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    pause: (reason?: string) =>
      request<BotStatus>('/bot/pause', {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    resume: () => request<BotStatus>('/bot/resume', { method: 'POST' }),
  },

  dashboard: {
    stats: () => request<DashboardStats>('/dashboard/stats'),
    recentTrades: (limit = 20, onlyCopied = false) =>
      request<RecentTrade[]>(
        `/dashboard/recent-trades?limit=${limit}&onlyCopied=${onlyCopied}`,
      ),
    weekly: (weeks = 12) =>
      request<WeeklyReport[]>(`/dashboard/reports/weekly?weeks=${weeks}`),
    compare: () => request<ComparativeAnalysis>('/dashboard/analysis/compare'),
  },

  wallets: {
    list: () => request<FollowedWallet[]>('/wallets'),
    active: () => request<FollowedWallet[]>('/wallets/active'),
    add: (wallet: string, label?: string) =>
      request<FollowedWallet>('/wallets', {
        method: 'POST',
        body: JSON.stringify({ wallet, label }),
      }),
    update: (
      id: string,
      data: { label?: string; isActive?: boolean; lastTradeId?: string | null },
    ) =>
      request<FollowedWallet>(`/wallets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    remove: (id: string) =>
      request<{ ok: boolean }>(`/wallets/${id}`, { method: 'DELETE' }),
  },

  alerts: {
    list: (unreadOnly = false) =>
      request<PerformanceAlert[]>(
        `/alerts?unreadOnly=${unreadOnly ? 'true' : 'false'}`,
      ),
    markRead: (id: string) =>
      request<PerformanceAlert>(`/alerts/${id}/read`, { method: 'PATCH' }),
    markAllRead: () =>
      request<{ count: number }>('/alerts/read-all', { method: 'PATCH' }),
  },

  operator: {
    list: () => request<OperatorWallet[]>('/operator/wallets'),
    link: (address: string, label?: string, isPrimary?: boolean) =>
      request<OperatorWallet>('/operator/wallets', {
        method: 'POST',
        body: JSON.stringify({ address, label, isPrimary }),
      }),
    setPrimary: (id: string) =>
      request<OperatorWallet>(`/operator/wallets/${id}/primary`, {
        method: 'PATCH',
      }),
    remove: (id: string) =>
      request<{ ok: boolean }>(`/operator/wallets/${id}`, {
        method: 'DELETE',
      }),
  },

  polymarket: {
    proxyWallet: (username: string) =>
      request<{ username: string; proxyWallet: string | null }>(
        `/polymarket/proxy-wallet/${encodeURIComponent(username)}`,
      ),
  },

  portfolio: {
    get: (source: 'bot' | 'wallet' = 'bot', address?: string) => {
      const q = new URLSearchParams({ source });
      if (address) q.set('address', address);
      return request<PortfolioResponse>(`/portfolio?${q.toString()}`);
    },
    reconcile: () =>
      request<{ updated: number; created: number; address: string | null }>(
        '/portfolio/reconcile',
        { method: 'POST' },
      ),
  },

  charts: {
    searchMarkets: (q = '', limit = 15) =>
      request<ChartMarket[]>(
        `/charts/markets/search?q=${encodeURIComponent(q)}&limit=${limit}`,
      ),
    priceHistory: (tokenId: string, interval = '1w') =>
      request<PriceHistoryResponse>(
        `/charts/price-history?tokenId=${encodeURIComponent(tokenId)}&interval=${encodeURIComponent(interval)}`,
      ),
    equity: () => request<BotEquityResponse>('/charts/equity'),
    recentTokens: (limit = 12) =>
      request<RecentTradeToken[]>(`/charts/recent-tokens?limit=${limit}`),
  },
};

export interface ChartMarketOutcome {
  name: string;
  tokenId: string;
  price: number | null;
}

export interface ChartMarket {
  id: string;
  question: string;
  slug: string;
  conditionId?: string;
  eventSlug?: string;
  eventTitle?: string;
  volume24hr?: number;
  active?: boolean;
  closed?: boolean;
  outcomes: ChartMarketOutcome[];
  yesTokenId: string | null;
  noTokenId: string | null;
}

export interface PriceHistoryResponse {
  tokenId: string;
  interval: string;
  fidelity: number;
  points: { time: number; value: number }[];
}

export interface BotEquityResponse {
  totalCopied: number;
  points: {
    time: number;
    copies: number;
    notional: number;
    signedNotional: number;
    tradeId: string;
    side: string;
    slug?: string | null;
  }[];
  note: string;
}

export interface RecentTradeToken {
  tokenId: string;
  marketId: string;
  slug?: string | null;
  side: string;
  lastAt: string;
}

export { API_URL };
