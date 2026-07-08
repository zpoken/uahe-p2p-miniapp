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

## Wiring the real backend

`src/store.tsx` is the only file that owns state. Replace its action bodies
with `fetch` calls to the p2p-bot API (validate `initData` server-side), keep
the same function signatures, and every screen keeps working unchanged.
