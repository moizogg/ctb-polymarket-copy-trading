import dotenv from 'dotenv';
dotenv.config();

function optionalEnv(key: string, fallback?: string): string | undefined {
  const value = process.env[key] ?? fallback;
  return value === undefined || value === '' ? undefined : value;
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

function numEnv(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw == null || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function boolEnv(key: string, fallback: boolean): boolean {
  const raw = process.env[key];
  if (raw == null || raw === '') return fallback;
  return raw === '1' || raw.toLowerCase() === 'true' || raw.toLowerCase() === 'yes';
}

/** Non-throwing config for app bootstrap (DB required only when connecting). */
export const env = {
  nodeEnv: optionalEnv('NODE_ENV', 'development')!,
  port: numEnv('PORT', 3000),

  // Database — prefer free hosted Postgres via DATABASE_URL (Neon/Supabase)
  databaseUrl: optionalEnv('DATABASE_URL'),
  dbHost: optionalEnv('DB_HOST', 'localhost')!,
  dbPort: numEnv('DB_PORT', 5432),
  dbUser: optionalEnv('DB_USER', 'postgres')!,
  dbPassword: optionalEnv('DB_PASSWORD', 'postgres')!,
  dbName: optionalEnv('DB_NAME', 'ctb')!,
  dbSync: boolEnv('DB_SYNC', true), // auto-create tables (default on)
  dbLogging: boolEnv('DB_LOGGING', false),

  // Polymarket / trading
  polymarketApiBase: optionalEnv(
    'POLYMARKET_API_BASE',
    'https://data-api.polymarket.com',
  )!,
  defaultLimit: numEnv('DEFAULT_LIMIT', 25),
  requestTimeoutMs: numEnv('REQUEST_TIMEOUT_MS', 15000),
  rpcUrl: optionalEnv('RPC_URL', 'https://poly.api.pocket.network')!,
  privateKey: optionalEnv('PRIVATE_KEY'),
  funderAddress: optionalEnv('FUNDER_ADDRESS'),
  polymarketApiCreds: optionalEnv('POLYMARKET_API_CREDS'),

  // Strategy (overridable without code change)
  minSignalSize: numEnv('MIN_SIGNAL_SIZE', 5),
  maxPositionSize: numEnv('MAX_POSITION_SIZE', 5),
  defaultTickSize: optionalEnv('DEFAULT_TICK_SIZE', '0.01')!,
  defaultNegRisk: boolEnv('DEFAULT_NEG_RISK', false),

  // Auth — if API_KEY is set, all non-public routes require x-api-key
  apiKey: optionalEnv('API_KEY'),

  // CORS — comma-separated origins; empty = reflect request origin in dev
  corsOrigins: optionalEnv('CORS_ORIGINS'),

  // Poller
  pollIntervalMs: numEnv('POLL_INTERVAL_MS', 1500),
};

export function requireTradingEnv(): {
  privateKey: string;
  funderAddress: string;
  polymarketApiCreds: string;
  rpcUrl: string;
} {
  return {
    privateKey: requireEnv('PRIVATE_KEY'),
    funderAddress: requireEnv('FUNDER_ADDRESS'),
    polymarketApiCreds: requireEnv('POLYMARKET_API_CREDS'),
    rpcUrl: requireEnv('RPC_URL'),
  };
}
