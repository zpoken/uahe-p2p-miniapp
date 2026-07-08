// Design-system primitives ported from the UAHe P2P Market design system
// (design-system/components + ui_kits/p2p_market/shared.jsx).

import { useMemo } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { haptic } from './telegram'

export type TileColor = 'lime' | 'yellow' | 'orange' | 'sky' | 'violet' | 'green'

// ---------- Icon — Material Symbols Rounded, the only icon system ----------

export function Icon({
  name,
  size = 24,
  fill = 0,
  color,
  style,
}: {
  name: string
  size?: number
  fill?: 0 | 1
  color?: string
  style?: CSSProperties
}) {
  return (
    <span
      className="material-symbols-rounded"
      aria-hidden="true"
      style={{
        fontSize: size,
        color: color ?? 'inherit',
        fontVariationSettings: `'FILL' ${fill}, 'wght' 400, 'GRAD' 0, 'opsz' ${Math.min(48, Math.max(20, size))}`,
        ...style,
      }}
    >
      {name}
    </span>
  )
}

// ---------- IconTile — 6px colored square, dark-slate glyph ----------

export function IconTile({
  icon,
  color = 'sky',
  size = 40,
}: {
  icon: string
  color?: TileColor
  size?: number
}) {
  return (
    <span className={`tile tile-${color}`} style={{ width: size, height: size }}>
      <Icon name={icon} size={Math.round(size * 0.55)} />
    </span>
  )
}

// ---------- CoinMark — ₴ coin device (green disc / ghosted watermark) ----------

export function CoinMark({
  size = 64,
  watermark = false,
  style,
}: {
  size?: number
  watermark?: boolean
  style?: CSSProperties
}) {
  const stroke = watermark ? 'rgba(26,28,32,.08)' : '#1a1c20'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
      style={{ display: 'block', pointerEvents: 'none', ...style }}
    >
      {!watermark && <circle cx="50" cy="50" r="46" fill="#66e982" />}
      <path
        d="M50 8 a42 42 0 0 1 40 30"
        stroke={stroke}
        strokeWidth={watermark ? 3 : 2.5}
        strokeLinecap="round"
        opacity={watermark ? 1 : 0.35}
      />
      <path
        d="M50 92 a42 42 0 0 1 -40 -30"
        stroke={stroke}
        strokeWidth={watermark ? 3 : 2.5}
        strokeLinecap="round"
        opacity={watermark ? 1 : 0.35}
      />
      <text
        x="50"
        y="52"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="'JetBrains Mono', monospace"
        fontWeight="700"
        fontSize="52"
        fill={watermark ? 'rgba(26,28,32,.08)' : '#1a1c20'}
      >
        ₴
      </text>
    </svg>
  )
}

// ---------- WaveArt — thin-line green terrain for hero corners ----------

export function WaveArt({ style }: { style?: CSSProperties }) {
  return (
    <svg
      viewBox="0 0 320 120"
      fill="none"
      aria-hidden="true"
      style={{ position: 'absolute', pointerEvents: 'none', ...style }}
    >
      <path
        d="M-10 70 C 40 70, 60 30, 110 32 S 190 70, 240 66 S 300 34, 340 38"
        stroke="#3dba58"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.22"
      />
      <path
        d="M-10 92 C 50 92, 70 56, 120 58 S 200 92, 250 88 S 310 60, 340 64"
        stroke="#3dba58"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.14"
      />
    </svg>
  )
}

// ---------- Barcode — crisp black bars (the one place black is allowed) ----------

export function Barcode({ value, height = 72 }: { value: string; height?: number }) {
  const bars = useMemo(() => {
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
    const out: { w: number; gap: number }[] = [{ w: 2, gap: 2 }]
    for (let i = 0; i < 52; i++) {
      out.push({ w: 1 + Math.floor(rnd() * 3), gap: 1 + Math.floor(rnd() * 3) })
    }
    out.push({ w: 2, gap: 0 })
    return out
  }, [value])

  return (
    <div className="barcode" style={{ height }} aria-label={value}>
      {bars.map((b, i) => (
        <span key={i} style={{ display: 'inline-block', height: '100%' }}>
          <span style={{ display: 'inline-block', width: b.w, height: '100%', background: '#000' }} />
          <span style={{ display: 'inline-block', width: b.gap, height: '100%' }} />
        </span>
      ))}
    </div>
  )
}

// ---------- Segmented — pill control, optional brand dots ----------

export interface SegOption {
  key: string
  label: string
  dot?: string
}

export function Segmented({
  options,
  value,
  onChange,
}: {
  options: SegOption[]
  value: string
  onChange: (key: string) => void
}) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button
          key={o.key}
          className={o.key === value ? 'active' : ''}
          onClick={() => {
            haptic('select')
            onChange(o.key)
          }}
        >
          {o.dot && <span className="op-dot" style={{ background: o.dot }} />}
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ---------- NetworkCard — radio card for chains ----------

export function NetworkCard({
  mark,
  name,
  sub,
  selected,
  onClick,
}: {
  mark: string
  name: string
  sub: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button className={`network-option ${selected ? 'selected' : ''}`} onClick={onClick}>
      <span className="net-mark">{mark}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="net-name">{name}</span>
        <span className="net-sub">{sub}</span>
      </span>
      <span className="radio-dot">{selected && <Icon name="check" size={15} fill={1} />}</span>
    </button>
  )
}

// ---------- ReceiptRow — the signature list item ----------

export function ReceiptRow({
  icon,
  tileColor = 'lime',
  leading,
  label,
  subline,
  amount,
  positive = false,
  badge,
  chevron = false,
  plain = false,
  onClick,
}: {
  icon?: string
  tileColor?: TileColor
  leading?: ReactNode
  label: ReactNode
  subline?: ReactNode
  amount?: string
  positive?: boolean
  badge?: ReactNode
  chevron?: boolean
  plain?: boolean
  onClick?: () => void
}) {
  const cls = `receipt ${plain ? 'plain' : ''}`
  const body = (
    <>
      {leading ?? (icon ? <IconTile icon={icon} color={tileColor} /> : null)}
      <span className="r-body">
        <span className="r-label" style={{ display: 'block' }}>
          {label}
        </span>
        {subline && (
          <span className="r-sub" style={{ display: 'block' }}>
            {subline}
          </span>
        )}
      </span>
      {(amount != null || badge) && (
        <span className="r-end">
          {amount != null && (
            <span className={`r-amount ${positive ? 'positive' : ''}`}>
              {positive && !amount.startsWith('+') ? `+${amount}` : amount}
            </span>
          )}
          {badge}
        </span>
      )}
      {chevron && <Icon name="chevron_right" size={22} color="var(--ink-60)" />}
    </>
  )
  if (onClick) {
    return (
      <button className={cls} onClick={onClick}>
        {body}
      </button>
    )
  }
  return <div className={cls}>{body}</div>
}

// ---------- StatusTimeline — withdraw progress ----------

export function StatusTimeline({ steps, active }: { steps: string[]; active: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
      {steps.map((s, i) => (
        <div key={s} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
          {i < steps.length - 1 && (
            <span
              style={{
                position: 'absolute',
                top: 9,
                left: '50%',
                width: '100%',
                height: 2,
                background: i < active ? 'var(--green-accent)' : 'var(--hairline)',
              }}
            />
          )}
          <span
            style={{
              position: 'relative',
              display: 'inline-block',
              width: 20,
              height: 20,
              borderRadius: 999,
              background: i <= active ? 'var(--green-accent)' : 'var(--surface-muted)',
            }}
          />
          <div
            className="mono"
            style={{
              fontSize: 11.5,
              fontWeight: 500,
              color: i <= active ? 'var(--ink)' : 'var(--ink-50)',
              marginTop: 8,
            }}
          >
            {s}
          </div>
        </div>
      ))}
    </div>
  )
}
