/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { haptic } from './telegram'
import { fmt } from './data'
import { Icon, WaveArt } from './ds'

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
  ticker = 'UAHe',
  autoFocus,
}: {
  value: string
  onChange: (v: string) => void
  presets?: number[]
  ticker?: string
  autoFocus?: boolean
}) {
  const ref = useRef<HTMLInputElement>(null)
  const width = Math.max(1, value.length) * 29 + 14

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
              className={`chip ${value === String(p) ? 'active' : ''}`}
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

const STATUS_MAP: Record<string, { label: string; tone: string }> = {
  PENDING: { label: 'Очікує', tone: 'yellow' },
  ACCEPTED: { label: 'В роботі', tone: 'sky' },
  CONFIRMED: { label: 'Виконано', tone: 'green' },
  DECLINED: { label: 'Відхилено', tone: 'red' },
  CANCELED: { label: 'Скасовано', tone: 'muted' },
  CREATED: { label: 'Активний', tone: 'chartreuse' },
  CLAIMED: { label: 'Активовано', tone: 'green' },
  EXPIRED: { label: 'Прострочено', tone: 'muted' },
  AUTO_APPROVED: { label: 'Схвалено', tone: 'sky' },
  NEEDS_ADMIN: { label: 'На перевірці', tone: 'yellow' },
  APPROVED: { label: 'Схвалено', tone: 'sky' },
  BROADCASTED: { label: 'В мережі', tone: 'sky' },
  MINED: { label: 'Виконано', tone: 'green' },
  FAILED: { label: 'Помилка', tone: 'red' },
}

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, tone: 'muted' }
  return <span className={`badge ${s.tone}`}>{s.label}</span>
}

// ---------- empty state ----------

export function EmptyState({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="empty-state">
      <div style={{ position: 'relative', height: 60 }}>
        <WaveArt style={{ left: '50%', top: 0, width: 280, height: 100, transform: 'translateX(-50%)' }} />
      </div>
      <div className="es-title">{title}</div>
      {sub && <div className="es-sub">{sub}</div>}
    </div>
  )
}

// ---------- key-value mono row ----------

export function KV({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="kv">
      <span className="k">{k}</span>
      <span className="v">{v}</span>
    </div>
  )
}

// ---------- copy field ----------

export function CopyBox({ value, note, label }: { value: string; note?: string; label?: string }) {
  const copy = useCopy()
  return (
    <div>
      {label && <span className="field-label">{label}</span>}
      <div className="copy-box">
        <span className="addr">{value}</span>
        <button className="icon-btn" onClick={() => copy(value, note)} aria-label="Копіювати">
          <Icon name="content_copy" size={20} />
        </button>
      </div>
    </div>
  )
}

// ---------- section title ----------

export function SectionTitle({
  children,
  action,
  onAction,
}: {
  children: ReactNode
  action?: string
  onAction?: () => void
}) {
  return (
    <div className="section-title">
      <h2>{children}</h2>
      {action && (
        <button className="st-action" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  )
}

// ---------- gradient word title helper ----------

export function GradTitle({ title, word }: { title: string; word?: string }) {
  if (!word || !title.includes(word)) return <>{title}</>
  const [before, after] = title.split(word)
  return (
    <>
      {before}
      <span className="grad-word">{word}</span>
      {after}
    </>
  )
}
