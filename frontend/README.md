# CTB Frontend (Phase 2)

Operator dashboard for the Polymarket copy-trading backend.

## Run

1. Backend must be running: `http://localhost:3000`
2. From this folder:

```bash
npm install
npm run dev
```

Open **http://localhost:3001** (Next default; if 3000 is busy it may use 3001).

## Env

Copy `.env.local.example` → `.env.local`:

- `NEXT_PUBLIC_API_URL` — Nest API base
- `NEXT_PUBLIC_API_KEY` — only if backend `API_KEY` is set
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` — free at [cloud.walletconnect.com](https://cloud.walletconnect.com) (needed for Trust / mobile WC)

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Dashboard stats + recent trades |
| `/leaders` | Add / pause / remove leaders |
| `/activity` | Trade log |
| `/portfolio` | Placeholder + wallet info |
| `/charts` | Phase 5 placeholder |
| `/alerts` | Performance alerts |
| `/settings` | Kill switch + linked wallets |

## Wallets

Connect (top right): MetaMask, WalletConnect, Trust, Rainbow, Coinbase, Phantom (EVM where available). Chain: **Polygon**.
