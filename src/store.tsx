// Demo data store. Mirrors the bot's ledger semantics (holds → capture/release)
// and persists to localStorage. All mutations go through action functions so the
// layer can later be swapped for real API calls against the p2p-bot backend.

/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type {
  Check,
  ChainCode,
  OwnedCert,
  Operation,
  RequestKind,
  ServiceRequest,
  WithdrawRequest,
} from './types'
import { CERT_BRANDS, CHAINS, LIMITS } from './data'

// v2: design-system migration renamed cert `emoji` → Material icon names
const LS_KEY = 'uahe_miniapp_v2'

export interface State {
  balance: number
  hold: number
  ops: Operation[]
  checks: Check[]
  requests: ServiceRequest[]
  certs: OwnedCert[]
  withdrawals: WithdrawRequest[]
  refEarned: number
  refInvited: number
  refPaying: number
  nextReqId: number
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase()
}

function seed(): State {
  const now = Date.now()
  const h = 3600_000
  return {
    balance: 12480.5,
    hold: 0,
    ops: [
      {
        id: uid(),
        kind: 'DEPOSIT',
        title: 'Поповнення · Ethereum · USDT',
        amount: 8330,
        createdAt: now - 26 * h,
        ref: '0x3f8a…c21e',
      },
      {
        id: uid(),
        kind: 'CAPTURE',
        title: 'Оплата заявки #10241 · Поповнення мобільного',
        amount: -450,
        createdAt: now - 20 * h,
      },
      {
        id: uid(),
        kind: 'DEPOSIT',
        title: 'Поповнення · Base · UAHe',
        amount: 5000,
        createdAt: now - 8 * h,
        ref: '0x91d4…77ab',
      },
      {
        id: uid(),
        kind: 'TRANSFER',
        title: 'Сертифікат АТБ · 500 грн',
        amount: -425,
        createdAt: now - 3 * h,
      },
      {
        id: uid(),
        kind: 'TRANSFER',
        title: 'Активовано чек від @andriy_k',
        amount: 25.5,
        createdAt: now - 1 * h,
      },
    ],
    checks: [],
    requests: [
      {
        id: 10241,
        kind: 'MOBILE_TOPUP',
        title: 'Поповнення мобільного',
        status: 'CONFIRMED',
        amountUah: 450,
        details: { Оператор: 'Київстар', Телефон: '067 555 12 34' },
        createdAt: now - 21 * h,
      },
    ],
    certs: [
      {
        id: uid(),
        brandCode: 'ATB',
        brandTitle: 'АТБ',
        icon: 'shopping_cart',
        color: '#0f5cbd',
        nominalUah: 500,
        priceUahe: 425,
        pin: '9823 4471 0952 6614',
        expiresAt: now + 90 * 24 * h,
        boughtAt: now - 3 * h,
      },
    ],
    withdrawals: [],
    refEarned: 184.2,
    refInvited: 7,
    refPaying: 3,
    nextReqId: 10242,
  }
}

function load(): State {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return seed()
    const st = JSON.parse(raw) as State
    // Finalize demo states that were mid-flight when the app closed.
    const now = Date.now()
    let { balance, hold } = st
    for (const r of st.requests) {
      if ((r.status === 'PENDING' || r.status === 'ACCEPTED') && now - r.createdAt > 60_000) {
        const total = r.amountUah + (r.feeUahe ?? 0)
        if (r.status === 'PENDING') {
          balance -= total
        } else {
          hold -= total
        }
        r.status = 'CONFIRMED'
        st.ops.unshift({
          id: uid(),
          kind: 'CAPTURE',
          title: `Оплата заявки #${r.id} · ${r.title}`,
          amount: -total,
          createdAt: now,
        })
        if (r.status === 'CONFIRMED' && r.kind !== 'GIFT_CERT') hold = Math.max(0, hold)
      }
    }
    for (const w of st.withdrawals) {
      if (w.status !== 'MINED' && w.status !== 'FAILED' && w.status !== 'CANCELED' && now - w.createdAt > 60_000) {
        w.status = 'MINED'
        w.txHash = w.txHash ?? `0x${uid().toLowerCase()}${uid().toLowerCase()}`
      }
    }
    for (const c of st.checks) {
      if (c.status === 'CREATED' && c.expiresAt && c.expiresAt < now) c.status = 'EXPIRED'
    }
    return { ...st, balance, hold: Math.max(0, hold) }
  } catch {
    return seed()
  }
}

interface Actions {
  simulateDeposit: (chain: ChainCode, token: string, amount: number) => void
  createWithdraw: (chain: ChainCode, to: string, amount: number) => WithdrawRequest
  createCheck: (amount: number, description: string, ttlHours: number) => Check
  cancelCheck: (token: string) => void
  createRequest: (
    kind: RequestKind,
    title: string,
    amountUah: number,
    details: Record<string, string>,
    feeUahe?: number,
  ) => ServiceRequest
  cancelRequest: (id: number) => void
  buyCert: (brandCode: string, nominal: number) => OwnedCert | null
  resetDemo: () => void
}

const StoreCtx = createContext<(State & Actions) | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(load)
  const timers = useRef<number[]>([])

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(state))
  }, [state])

  useEffect(() => {
    const list = timers.current
    return () => list.forEach(clearTimeout)
  }, [])

  const later = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms))
  }

  const pushOp = (st: State, op: Omit<Operation, 'id' | 'createdAt'>): State => ({
    ...st,
    ops: [{ ...op, id: uid(), createdAt: Date.now() }, ...st.ops],
  })

  const actions: Actions = {
    simulateDeposit(chain, token, amount) {
      const chainTitle = CHAINS.find((c) => c.code === chain)?.title ?? chain
      const credited = token === 'UAHe' ? amount : Math.round(amount * 41.65 * 100) / 100
      setState((st) =>
        pushOp(
          { ...st, balance: st.balance + credited },
          {
            kind: 'DEPOSIT',
            title: `Поповнення · ${chainTitle} · ${token}`,
            amount: credited,
            ref: `0x${uid().toLowerCase()}…${uid().slice(0, 4).toLowerCase()}`,
          },
        ),
      )
    },

    createWithdraw(chain, to, amount) {
      const fee = CHAINS.find((c) => c.code === chain)?.withdrawFeeFlat ?? 0
      const wd: WithdrawRequest = {
        id: uid(),
        chain,
        to,
        amount,
        fee,
        status: 'CREATED',
        createdAt: Date.now(),
      }
      setState((st) =>
        pushOp(
          {
            ...st,
            balance: st.balance - amount - fee,
            withdrawals: [wd, ...st.withdrawals],
          },
          {
            kind: 'WITHDRAWAL',
            title: `Вивід · ${CHAINS.find((c) => c.code === chain)?.title ?? chain}`,
            amount: -(amount + fee),
            ref: wd.id,
          },
        ),
      )
      later(4000, () =>
        setState((st) => ({
          ...st,
          withdrawals: st.withdrawals.map((w) =>
            w.id === wd.id && w.status === 'CREATED' ? { ...w, status: 'BROADCASTED' } : w,
          ),
        })),
      )
      later(12000, () =>
        setState((st) => ({
          ...st,
          withdrawals: st.withdrawals.map((w) =>
            w.id === wd.id && w.status !== 'MINED'
              ? { ...w, status: 'MINED', txHash: `0x${uid().toLowerCase()}${uid().toLowerCase()}` }
              : w,
          ),
        })),
      )
      return wd
    },

    createCheck(amount, description, ttlHours) {
      const chk: Check = {
        token: `chk_${uid()}${uid().slice(0, 4)}`,
        amount,
        status: 'CREATED',
        description: description || undefined,
        createdAt: Date.now(),
        expiresAt: Date.now() + Math.min(ttlHours, LIMITS.checkMaxTtlHours) * 3600_000,
      }
      setState((st) =>
        pushOp(
          { ...st, balance: st.balance - amount, checks: [chk, ...st.checks] },
          { kind: 'HOLD', title: `Створено чек на ${amount} UAHe`, amount: -amount, ref: chk.token },
        ),
      )
      return chk
    },

    cancelCheck(token) {
      setState((st) => {
        const chk = st.checks.find((c) => c.token === token)
        if (!chk || chk.status !== 'CREATED') return st
        return pushOp(
          {
            ...st,
            balance: st.balance + chk.amount,
            checks: st.checks.map((c) =>
              c.token === token ? { ...c, status: 'CANCELED' as const } : c,
            ),
          },
          { kind: 'RELEASE', title: 'Скасовано чек — кошти повернено', amount: chk.amount, ref: token },
        )
      })
    },

    createRequest(kind, title, amountUah, details, feeUahe) {
      const req: ServiceRequest = {
        id: 0,
        kind,
        title,
        status: 'PENDING',
        amountUah,
        feeUahe,
        details,
        createdAt: Date.now(),
      }
      setState((st) => {
        req.id = st.nextReqId
        return { ...st, nextReqId: st.nextReqId + 1, requests: [req, ...st.requests] }
      })
      const total = amountUah + (feeUahe ?? 0)
      // Demo merchant: accepts (hold) then confirms (capture).
      later(6000, () =>
        setState((st) => {
          const cur = st.requests.find((r) => r.id === req.id)
          if (!cur || cur.status !== 'PENDING') return st
          return pushOp(
            {
              ...st,
              balance: st.balance - total,
              hold: st.hold + total,
              requests: st.requests.map((r) =>
                r.id === req.id ? { ...r, status: 'ACCEPTED' as const } : r,
              ),
            },
            {
              kind: 'HOLD',
              title: `Заявка #${req.id} прийнята — кошти заблоковано`,
              amount: -total,
            },
          )
        }),
      )
      later(15000, () =>
        setState((st) => {
          const cur = st.requests.find((r) => r.id === req.id)
          if (!cur || cur.status !== 'ACCEPTED') return st
          return pushOp(
            {
              ...st,
              hold: Math.max(0, st.hold - total),
              requests: st.requests.map((r) =>
                r.id === req.id ? { ...r, status: 'CONFIRMED' as const } : r,
              ),
            },
            {
              kind: 'CAPTURE',
              title: `Оплата заявки #${req.id} · ${title}`,
              amount: 0,
            },
          )
        }),
      )
      return req
    },

    cancelRequest(id) {
      setState((st) => {
        const cur = st.requests.find((r) => r.id === id)
        if (!cur || cur.status !== 'PENDING') return st
        return {
          ...st,
          requests: st.requests.map((r) =>
            r.id === id ? { ...r, status: 'CANCELED' as const } : r,
          ),
        }
      })
    },

    buyCert(brandCode, nominal) {
      const brand = CERT_BRANDS.find((b) => b.code === brandCode)
      if (!brand) return null
      const price = Math.round(nominal * (1 - brand.discountPct / 100) * 100) / 100
      const cert: OwnedCert = {
        id: uid(),
        brandCode: brand.code,
        brandTitle: brand.title,
        icon: brand.icon,
        color: brand.color,
        nominalUah: nominal,
        priceUahe: price,
        pin: Array.from({ length: 4 }, () =>
          String(Math.floor(1000 + Math.random() * 9000)),
        ).join(' '),
        activationKeyName: brand.activationKeyName,
        activationKeyValue: brand.activationKeyName
          ? String(Math.floor(100000 + Math.random() * 900000))
          : undefined,
        expiresAt: Date.now() + 180 * 24 * 3600_000,
        boughtAt: Date.now(),
      }
      setState((st) =>
        pushOp(
          { ...st, balance: st.balance - price, certs: [cert, ...st.certs] },
          {
            kind: 'TRANSFER',
            title: `Сертифікат ${brand.title} · ${nominal} грн`,
            amount: -price,
          },
        ),
      )
      return cert
    },

    resetDemo() {
      localStorage.removeItem(LS_KEY)
      setState(seed())
    },
  }

  return <StoreCtx.Provider value={{ ...state, ...actions }}>{children}</StoreCtx.Provider>
}

export function useStore() {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore outside provider')
  return ctx
}
