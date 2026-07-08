/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { haptic } from './telegram'
import { TICKER, fmt } from './data'

// ---------- toast ----------

const ToastCtx = createContext<(msg: string) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const show = (m: string) => {
    setMsg(m)
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setMsg(null), 2200)
  }

  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg && <div className="toast">{msg}</div>}
    </ToastCtx.Provider>
  )
}

export function useToast() {
  return useContext(ToastCtx)
}

export function useCopy() {
  const toast = useToast()
  return async (text: string, note = 'Скопійовано') => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    haptic('success')
    toast(note)
  }
}

// ---------- bottom sheet ----------

export function Sheet({
  title,
  onClose,
  children,
}: {
  title?: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog">
        <div className="sheet-grip" />
        {title && <h3>{title}</h3>}
        {children}
      </div>
    </>
  )
}

// ---------- amount input ----------

export function AmountInput({
  value,
  onChange,
  presets,
  ticker = TICKER,
  autoFocus,
}: {
  value: string
  onChange: (v: string) => void
  presets?: number[]
  ticker?: string
  autoFocus?: boolean
}) {
  const ref = useRef<HTMLInputElement>(null)

  // grow the input with its content
  const width = Math.max(1, value.length) * 26 + 14

  return (
    <div>
      <div className="amount-input-wrap" onClick={() => ref.current?.focus()}>
        <input
          ref={ref}
          className="amount-input"
          style={{ width }}
          inputMode="decimal"
          placeholder="0"
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => {
            const v = e.target.value.replace(',', '.').replace(/[^\d.]/g, '')
            if ((v.match(/\./g) ?? []).length > 1) return
            onChange(v)
          }}
        />
        <span className="amount-ticker">{ticker}</span>
      </div>
      {presets && (
        <div className="amount-presets">
          {presets.map((p) => (
            <button
              key={p}
              className={`preset-chip ${value === String(p) ? 'active' : ''}`}
              onClick={() => {
                haptic('select')
                onChange(String(p))
              }}
            >
              {fmt(p)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------- status badge ----------

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Очікує', cls: 'badge-amber' },
  ACCEPTED: { label: 'В роботі', cls: 'badge-blue' },
  CONFIRMED: { label: 'Виконано', cls: 'badge-green' },
  DECLINED: { label: 'Відхилено', cls: 'badge-red' },
  CANCELED: { label: 'Скасовано', cls: 'badge-gray' },
  CREATED: { label: 'Активний', cls: 'badge-blue' },
  CLAIMED: { label: 'Активовано', cls: 'badge-green' },
  EXPIRED: { label: 'Прострочено', cls: 'badge-gray' },
  AUTO_APPROVED: { label: 'Схвалено', cls: 'badge-blue' },
  NEEDS_ADMIN: { label: 'На перевірці', cls: 'badge-amber' },
  APPROVED: { label: 'Схвалено', cls: 'badge-blue' },
  BROADCASTED: { label: 'В мережі', cls: 'badge-blue' },
  MINED: { label: 'Виконано', cls: 'badge-green' },
  FAILED: { label: 'Помилка', cls: 'badge-red' },
}

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, cls: 'badge-gray' }
  return <span className={`badge ${s.cls}`}>{s.label}</span>
}

// ---------- empty state ----------

export function EmptyState({ emoji, title, sub }: { emoji: string; title: string; sub?: string }) {
  return (
    <div className="empty-state">
      <div className="es-emoji">{emoji}</div>
      <div className="es-title">{title}</div>
      {sub && <div style={{ fontSize: 13 }}>{sub}</div>}
    </div>
  )
}

// ---------- decorative barcode (deterministic from a string) ----------

export function Barcode({ value, height = 58 }: { value: string; height?: number }) {
  const bars = useMemo(() => {
    // deterministic pseudo-random bar widths from the value
    let h = 2166136261
    for (const ch of value) {
      h ^= ch.charCodeAt(0)
      h = Math.imul(h, 16777619)
    }
    const rnd = () => {
      h ^= h << 13
      h ^= h >>> 17
      h ^= h << 5
      return (h >>> 0) / 4294967295
    }
    const out: { x: number; w: number }[] = []
    let x = 0
    // guard bars
    out.push({ x, w: 2 })
    x += 4
    while (x < 216) {
      const w = 1 + Math.floor(rnd() * 3)
      out.push({ x, w })
      x += w + 1 + Math.floor(rnd() * 3)
    }
    out.push({ x: 218, w: 2 })
    return out
  }, [value])

  return (
    <svg
      className="barcode"
      width="220"
      height={height}
      viewBox={`0 0 220 ${height}`}
      aria-label={value}
    >
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={0} width={b.w} height={height} fill="#10192b" />
      ))}
    </svg>
  )
}

// ---------- key-value row ----------

export function KV({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="kv">
      <span className="k">{k}</span>
      <span className="v">{v}</span>
    </div>
  )
}
