# UAHe P2P Market — Telegram Mini App

A Telegram Mini App re-imagining of the **UAHe P2P Market** bot: balance in UAHe,
multi-chain deposits (Ethereum / Base / TRON), withdrawals with daily limits,
checks (deep-link vouchers), discounted gift certificates, and payment services
(mobile top-up, IBAN/card transfers, bill payments, PetrolCard, Nova Poshta COD).

**Live:** https://zpoken.github.io/uahe-p2p-miniapp/

## Stack

- React 19 + TypeScript + Vite
- Telegram WebApp SDK (theme, haptics, BackButton, share links)
- No UI framework — hand-crafted design system in `src/index.css`
- Demo data layer (`src/store.tsx`) with localStorage persistence, structured
  as an API client so it can be swapped for the real p2p-bot FastAPI backend

## Development

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # static build in dist/
```

## Connect to the bot

1. Open [@BotFather](https://t.me/BotFather) → `/mybots` → your bot →
   **Bot Settings → Menu Button** (or **Configure Mini App**).
2. Set the URL to `https://zpoken.github.io/uahe-p2p-miniapp/`.
3. Open the bot in Telegram and tap the menu button — the app picks up the
   user's name/avatar and theme automatically via `window.Telegram.WebApp`.

## Connecting the real backend

The app has two data modes (`src/api.ts` + `src/store.tsx`):

- **Demo mode** (default): local data in localStorage, simulated merchant flows.
- **API mode**: state comes from the p2p-bot `/miniapp/*` FastAPI (auth via
  Telegram `initData` HMAC). Enable it either at build time
  (`VITE_API_BASE=https://api.example.com npm run build`) or at runtime by
  opening the app with `?api=https://api.example.com` (persisted to
  localStorage; `?api=off` clears it).

Backend side: see `MINIAPP_API.md` in the p2p-bot repo — it documents the
`/miniapp` router, CORS settings, and the Cloudflare Tunnel runbook that
exposes the bot's existing FastAPI (the bot itself keeps using polling).
