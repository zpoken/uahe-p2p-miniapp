// HTTP client for the p2p-bot /miniapp API.
//
// The API base URL is resolved from (in priority order):
//   1. ?api=https://… query parameter (persisted to localStorage — handy for testing)
//   2. VITE_API_BASE at build time
// When neither is set the app runs in demo mode (local data, no network).

import { tg } from './telegram'

const LS_API_KEY = 'uahe_api_base'

function resolveBase(): string {
  try {
    const qs = new URLSearchParams(window.location.search)
    const fromQuery = qs.get('api')
    if (fromQuery !== null) {
      if (fromQuery === '' || fromQuery === 'off') {
        localStorage.removeItem(LS_API_KEY)
        return ''
      }
      localStorage.setItem(LS_API_KEY, fromQuery)
      return fromQuery
    }
    const stored = localStorage.getItem(LS_API_KEY)
    if (stored) return stored
  } catch {
    /* no storage */
  }
  return import.meta.env.VITE_API_BASE ?? ''
}

export const API_BASE = resolveBase().replace(/\/$/, '')
export const apiMode = API_BASE !== ''

function authHeader(): string {
  if (tg?.initData) return `tma ${tg.initData}`
  // Outside Telegram: dev auth (backend accepts it only with MINIAPP_ALLOW_UNSIGNED=true)
  return `dev ${tg?.initDataUnsafe?.user?.id ?? 42}`
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/miniapp${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const j = await res.json()
      detail = typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail ?? j)
    } catch {
      /* non-JSON error */
    }
    throw new ApiError(res.status, detail)
  }
  return res.json() as Promise<T>
}

// ---------- endpoint types ----------

export interface ApiMe {
  tg_id: number
  balance: number
  hold: number
  ref_code: string | null
  ref_invited: number
}

export interface ApiOperation {
  id: number
  kind: string
  amount: number
  ref: string | null
  created_at: string | null
}

export interface ApiCheck {
  token: string
  amount: number
  status: string
  description: string | null
  created_at: string | null
  expires_at: string | null
  link: string
}

export interface ApiRequest {
  id: number
  kind: string
  title: string
  status: string
  amount_uah: number
  details: Record<string, string>
  decline_reason: string | null
  created_at: string | null
}

export interface ApiWithdrawal {
  id: number
  chain_code: string
  to: string
  amount: number
  fee: number
  status: string
  tx_hash: string | null
  created_at: string | null
}

export interface ApiOwnedCert {
  id: number
  brand_code: string
  brand_title: string
  activation_key_name: string | null
  pin: string
  serial: string | null
  activation_key_value: string | null
  nominal_uah: number
  price_uah: number
  expires_at: string | null
  bought_at: string | null
}

// ---------- endpoints ----------

export const api = {
  me: () => call<ApiMe>('/me'),
  operations: () => call<ApiOperation[]>('/operations'),
  checks: () => call<ApiCheck[]>('/checks'),
  createCheck: (amount: number, description: string, ttlHours: number) =>
    call<{ token: string; link: string }>('/checks', {
      method: 'POST',
      body: JSON.stringify({ amount, description: description || null, ttl_hours: ttlHours }),
    }),
  cancelCheck: (token: string) =>
    call<{ ok: boolean }>(`/checks/${encodeURIComponent(token)}/cancel`, { method: 'POST' }),
  requests: () => call<ApiRequest[]>('/requests'),
  createMobile: (operator: string, phone10: string, amountUah: number) =>
    call<{ id: number }>('/requests/mobile', {
      method: 'POST',
      body: JSON.stringify({ operator, phone10, amount_uah: amountUah }),
    }),
  createIban: (body: {
    payment_method: 'IBAN' | 'CARD'
    iban?: string
    card_pan?: string
    payee_tin?: string
    payee_name?: string
    amount_uah: number
  }) => call<{ id: number }>('/requests/iban', { method: 'POST', body: JSON.stringify(body) }),
  createOthers: (operator: string, account: string, amountUah: number) =>
    call<{ id: number }>('/requests/others', {
      method: 'POST',
      body: JSON.stringify({ operator, account, amount_uah: amountUah }),
    }),
  cancelRequest: (id: number) => call<{ ok: boolean }>(`/requests/${id}/cancel`, { method: 'POST' }),
  withdrawals: () => call<ApiWithdrawal[]>('/withdrawals'),
  createWithdraw: (chainCode: string, to: string, amount: number) =>
    call<{ id: number; status: string; withdraw_ref: string }>('/withdraw', {
      method: 'POST',
      body: JSON.stringify({ chain_code: chainCode, to, amount }),
    }),
  certificates: () => call<ApiOwnedCert[]>('/certificates'),
  purchaseCert: (brandCode: string, nominalUah: number) =>
    call<{ result: string; certificate: ApiOwnedCert | null }>('/certificates/purchase', {
      method: 'POST',
      body: JSON.stringify({ brand_code: brandCode, nominal_uah: nominalUah }),
    }),
}
