// App state. Two modes:
//  - API mode (apiMode=true): state is loaded from the p2p-bot /miniapp API and
//    every action calls the backend, then refreshes. Enabled by VITE_API_BASE
//    or a ?api=https://… override (see src/api.ts).
//  - Demo mode: local data persisted to localStorage, with simulated merchant
//    behavior (holds → capture) mirroring the bot's ledger semantics.

/* eslint-disable react-refresh/only-export-components */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type {
  Check,
  ChainCode,
  OwnedCert,
  Operation,
  RequestKind,
  ServiceRequest,
  WithdrawRequest,
  WithdrawStatus,
} from './types'
import { CERT_BRANDS, CHAINS, LIMITS, OPERATORS } from './data'
import { api, apiMode } from './api'
import type { ApiOwnedCert } from './api'

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
  apiReady: boolean
  apiError: string | null
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase()
}

function emptyState(): State {
  return {
    balance: 0,
    hold: 0,
    ops: [],
    checks: [],
    requests: [],
    certs: [],
    withdrawals: [],
    refEarned: 0,
    refInvited: 0,
    refPaying: 0,
    nextReqId: 0,
    apiReady: false,
    apiError: null,
  }
}

function seed(): State {
  const now = Date.now()
  const h = 3600_000
  return {
    ...emptyState(),
    apiReady: true,
    balance: 12480.5,
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
        title: 'Оплата заявки №10241 · Поповнення мобільного',
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
    const st = { ...emptyState(), ...(JSON.parse(raw) as Partial<State>), apiReady: true }
    // Finalize demo states that were mid-flight when the app closed.
    const now = Date.now()
    let { balance, hold } = st
    for (const r of st.requests) {
      if ((r.status === 'PENDING' || r.status === 'ACCEPTED') && now - r.createdAt > 60_000) {
        const total = r.amountUah + (r.feeUahe ?? 0)
        if (r.status === 'PENDING') balance -= total
        else hold -= total
        r.status = 'CONFIRMED'
        st.ops.unshift({
          id: uid(),
          kind: 'CAPTURE',
          title: `Оплата заявки №${r.id} · ${r.title}`,
          amount: -total,
          createdAt: now,
        })
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

// ---------- API response mapping ----------

const OP_TITLES: Record<string, string> = {
  DEPOSIT: 'Поповнення',
  WITHDRAWAL: 'Вивід коштів',
  TRANSFER: 'Переказ',
  HOLD: 'Блокування коштів',
  CAPTURE: 'Оплата заявки',
  RELEASE: 'Повернення коштів',
}

function ts(s: string | null): number {
  return s ? Date.parse(s) : Date.now()
}

function mapCert(c: ApiOwnedCert): OwnedCert {
  const local = CERT_BRANDS.find((b) => b.code === c.brand_code)
  return {
    id: String(c.id ?? c.pin),
    brandCode: c.brand_code,
    brandTitle: c.brand_title,
    icon: local?.icon ?? 'redeem',
    color: local?.color ?? '#3dba58',
    nominalUah: c.nominal_uah,
    priceUahe: c.price_uah,
    pin: c.pin,
    activationKeyName: c.activation_key_name ?? undefined,
    activationKeyValue: c.activation_key_value ?? undefined,
    expiresAt: c.expires_at ? Date.parse(c.expires_at) : Date.now() + 365 * 24 * 3600_000,
    boughtAt: c.bought_at ? Date.parse(c.bought_at) : Date.now(),
  }
}

interface Actions {
  apiMode: boolean
  refresh: () => Promise<void>
  simulateDeposit: (chain: ChainCode, token: string, amount: number) => void
  createWithdraw: (chain: ChainCode, to: string, amount: number) => Promise<WithdrawRequest>
  createCheck: (amount: number, description: string, ttlHours: number) => Promise<Check>
  cancelCheck: (token: string) => Promise<void>
  createMobileRequest: (operator: string, phone10: string, amountUah: number) => Promise<ServiceRequest>
  createIbanRequest: (p: {
    method: 'IBAN' | 'CARD'
    iban?: string
    tin?: string
    payeeName?: string
    pan?: string
    amountUah: number
    feeUahe?: number
  }) => Promise<ServiceRequest>
  createBillRequest: (fileName: string, amountUah: number) => Promise<ServiceRequest>
  createOthersRequest: (
    operatorCode: string,
    accountTitle: string,
    account: string,
    amountUah: number,
  ) => Promise<ServiceRequest>
  cancelRequest: (id: number) => Promise<void>
  buyCert: (brandCode: string, nominal: number) => Promise<OwnedCert | null>
  resetDemo: () => void
}

const StoreCtx = createContext<(State & Actions) | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(() => (apiMode ? emptyState() : load()))
  const timers = useRef<number[]>([])

  useEffect(() => {
    if (!apiMode) localStorage.setItem(LS_KEY, JSON.stringify(state))
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

  // ---------- API mode: load everything from the backend ----------

  const refresh = useCallback(async () => {
    if (!apiMode) return
    const [me, ops, checks, requests, withdrawals, certs] = await Promise.all([
      api.me(),
      api.operations(),
      api.checks(),
      api.requests(),
      api.withdrawals(),
      api.certificates(),
    ])
    setState((st) => ({
      ...st,
      apiReady: true,
      apiError: null,
      balance: me.balance,
      hold: me.hold,
      refInvited: me.ref_invited,
      ops: ops.map((o) => ({
        id: String(o.id),
        kind: o.kind as Operation['kind'],
        title: `${OP_TITLES[o.kind] ?? o.kind}${o.ref ? ` · ${o.ref.slice(0, 18)}` : ''}`,
        amount: o.amount,
        createdAt: ts(o.created_at),
        ref: o.ref ?? undefined,
      })),
      checks: checks.map((c) => ({
        token: c.token,
        amount: c.amount,
        status: c.status as Check['status'],
        description: c.description ?? undefined,
        createdAt: ts(c.created_at),
        expiresAt: c.expires_at ? Date.parse(c.expires_at) : undefined,
      })),
      requests: requests.map((r) => ({
        id: r.id,
        kind: r.kind as RequestKind,
        title: r.title,
        status: r.status as ServiceRequest['status'],
        amountUah: r.amount_uah,
        details: r.details,
        declineReason: r.decline_reason ?? undefined,
        createdAt: ts(r.created_at),
      })),
      withdrawals: withdrawals.map((w) => ({
        id: String(w.id),
        chain: w.chain_code as ChainCode,
        to: w.to,
        amount: w.amount,
        fee: w.fee,
        status: w.status as WithdrawStatus,
        createdAt: ts(w.created_at),
        txHash: w.tx_hash ?? undefined,
      })),
      certs: certs.map(mapCert),
    }))
  }, [])

  useEffect(() => {
    if (!apiMode) return
    refresh().catch((e) =>
      setState((st) => ({ ...st, apiReady: true, apiError: String(e?.message ?? e) })),
    )
  }, [refresh])

  // ---------- demo helpers (unchanged behavior) ----------

  const demoRequestLifecycle = (req: ServiceRequest, total: number) => {
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
          { kind: 'HOLD', title: `Заявка №${req.id} прийнята — кошти заблоковано`, amount: -total },
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
          { kind: 'CAPTURE', title: `Оплата заявки №${req.id} · ${req.title}`, amount: 0 },
        )
      }),
    )
  }

  const demoCreateRequest = (
    kind: RequestKind,
    title: string,
    amountUah: number,
    details: Record<string, string>,
    feeUahe?: number,
  ): ServiceRequest => {
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
    demoRequestLifecycle(req, amountUah + (feeUahe ?? 0))
    return req
  }

  const apiRequestOf = (
    id: number,
    kind: RequestKind,
    title: string,
    amountUah: number,
    details: Record<string, string>,
    feeUahe?: number,
  ): ServiceRequest => ({
    id,
    kind,
    title,
    status: 'PENDING',
    amountUah,
    feeUahe,
    details,
    createdAt: Date.now(),
  })

  // ---------- actions ----------

  const actions: Actions = {
    apiMode,
    refresh,

    simulateDeposit(chain, token, amount) {
      if (apiMode) return
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

    async createWithdraw(chain, to, amount) {
      const fee = CHAINS.find((c) => c.code === chain)?.withdrawFeeFlat ?? 0
      if (apiMode) {
        const r = await api.createWithdraw(chain, to, amount)
        const wd: WithdrawRequest = {
          id: String(r.id),
          chain,
          to,
          amount,
          fee,
          status: r.status as WithdrawStatus,
          createdAt: Date.now(),
        }
        setState((st) => ({ ...st, withdrawals: [wd, ...st.withdrawals] }))
        refresh().catch(() => {})
        return wd
      }
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
          { ...st, balance: st.balance - amount - fee, withdrawals: [wd, ...st.withdrawals] },
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

    async createCheck(amount, description, ttlHours) {
      if (apiMode) {
        const r = await api.createCheck(amount, description, ttlHours)
        const chk: Check = {
          token: r.token,
          amount,
          status: 'CREATED',
          description: description || undefined,
          createdAt: Date.now(),
          expiresAt: Date.now() + ttlHours * 3600_000,
        }
        setState((st) => ({ ...st, checks: [chk, ...st.checks] }))
        refresh().catch(() => {})
        return chk
      }
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

    async cancelCheck(token) {
      if (apiMode) {
        await api.cancelCheck(token)
        setState((st) => ({
          ...st,
          checks: st.checks.map((c) => (c.token === token ? { ...c, status: 'CANCELED' } : c)),
        }))
        refresh().catch(() => {})
        return
      }
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

    async createMobileRequest(operator, phone10, amountUah) {
      const details = {
        Оператор: OPERATORS.find((o) => o.code === operator)?.title ?? operator,
        Телефон: phone10.replace(/(\d{3})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4'),
      }
      if (apiMode) {
        const r = await api.createMobile(operator, phone10, amountUah)
        refresh().catch(() => {})
        const req = apiRequestOf(r.id, 'MOBILE_TOPUP', 'Поповнення мобільного', amountUah, details)
        setState((st) => ({ ...st, requests: [req, ...st.requests] }))
        return req
      }
      return demoCreateRequest('MOBILE_TOPUP', 'Поповнення мобільного', amountUah, details)
    },

    async createIbanRequest(p) {
      const isIban = p.method === 'IBAN'
      const details: Record<string, string> = isIban
        ? { IBAN: p.iban ?? '', 'РНОКПП (ІПН)': p.tin ?? '', Отримувач: p.payeeName ?? '' }
        : { Картка: p.pan ?? '' }
      const title = isIban ? 'Переказ на IBAN' : 'Переказ на картку'
      if (apiMode) {
        const r = await api.createIban({
          payment_method: p.method,
          iban: p.iban,
          card_pan: p.pan?.replace(/\s/g, ''),
          payee_tin: p.tin,
          payee_name: p.payeeName,
          amount_uah: p.amountUah,
        })
        refresh().catch(() => {})
        const req = apiRequestOf(r.id, isIban ? 'IBAN_P2P' : 'CARD_P2P', title, p.amountUah, details, p.feeUahe)
        setState((st) => ({ ...st, requests: [req, ...st.requests] }))
        return req
      }
      return demoCreateRequest(isIban ? 'IBAN_P2P' : 'CARD_P2P', title, p.amountUah, details, p.feeUahe)
    },

    async createBillRequest(fileName, amountUah) {
      if (apiMode) {
        throw new Error('Оплата рахунку за фото доступна в чаті бота — потрібне фото рахунку.')
      }
      return demoCreateRequest('BILL_SCAN', 'Оплата товарів/послуг', amountUah, { Рахунок: fileName })
    },

    async createOthersRequest(operatorCode, accountTitle, account, amountUah) {
      const svcTitle = operatorCode === 'PETROLCARD' ? 'Поповнити PetrolCard' : 'Післяоплата НоваПошта'
      const details = { [accountTitle]: account }
      if (apiMode) {
        const r = await api.createOthers(operatorCode, account, amountUah)
        refresh().catch(() => {})
        const req = apiRequestOf(r.id, 'OTHERS', svcTitle, amountUah, details)
        setState((st) => ({ ...st, requests: [req, ...st.requests] }))
        return req
      }
      return demoCreateRequest('OTHERS', svcTitle, amountUah, details)
    },

    async cancelRequest(id) {
      if (apiMode) {
        await api.cancelRequest(id)
        setState((st) => ({
          ...st,
          requests: st.requests.map((r) => (r.id === id ? { ...r, status: 'CANCELED' } : r)),
        }))
        refresh().catch(() => {})
        return
      }
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

    async buyCert(brandCode, nominal) {
      if (apiMode) {
        const r = await api.purchaseCert(brandCode, nominal)
        if (!r.certificate) {
          // MANUAL_CONFIRM flow: заявка створена, сертифікат прийде після підтвердження
          refresh().catch(() => {})
          return null
        }
        const cert = mapCert(r.certificate)
        setState((st) => ({ ...st, certs: [cert, ...st.certs] }))
        refresh().catch(() => {})
        return cert
      }
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
        pin: Array.from({ length: 4 }, () => String(Math.floor(1000 + Math.random() * 9000))).join(' '),
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
          { kind: 'TRANSFER', title: `Сертифікат ${brand.title} · ${nominal} грн`, amount: -price },
        ),
      )
      return cert
    },

    resetDemo() {
      if (apiMode) {
        refresh().catch(() => {})
        return
      }
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
