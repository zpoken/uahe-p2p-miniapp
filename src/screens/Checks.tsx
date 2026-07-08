import { useState } from 'react'
import { BackHeader, useNav } from '../nav'
import { useStore } from '../store'
import { BOT_USERNAME, LIMITS, TICKER, fmt, fmtDate } from '../data'
import { AmountInput, EmptyState, KV, StatusBadge, useCopy } from '../components'
import { haptic, openTgLink } from '../telegram'

const TTL_OPTIONS = [
  { hours: 24, label: '1 день' },
  { hours: 72, label: '3 дні' },
  { hours: 168, label: '7 днів' },
  { hours: 720, label: '30 днів' },
]

export function checkLink(token: string): string {
  return `https://t.me/${BOT_USERNAME}?start=${token}`
}

export function ChecksList() {
  const st = useStore()
  const nav = useNav()

  return (
    <div className="screen">
      <BackHeader title="Мої чеки" />
      <p className="screen-sub">
        Чек — це посилання з сумою в {TICKER}. Поділіться ним — отримувач активує чек у боті й
        миттєво отримає кошти.
      </p>

      <button className="btn btn-gold" onClick={() => nav.push({ name: 'check-create' })}>
        ➕ Створити чек
      </button>

      <div className="section-label">Історія чеків</div>
      {st.checks.length === 0 && (
        <EmptyState emoji="🧾" title="Чеків ще немає" sub="Створіть перший чек і поділіться ним" />
      )}
      {st.checks.map((c) => (
        <button
          key={c.token}
          className="row"
          onClick={() => nav.push({ name: 'check-detail', token: c.token })}
        >
          <div className={`row-icon ${c.status === 'CREATED' ? 'tint-gold' : 'tint-blue'}`}>🧾</div>
          <div className="row-body">
            <div className="row-title">
              {fmt(c.amount)} {TICKER}
            </div>
            <div className="row-sub">{c.description || fmtDate(c.createdAt)}</div>
          </div>
          <div className="row-end">
            <StatusBadge status={c.status} />
          </div>
        </button>
      ))}
    </div>
  )
}

export function CheckCreate() {
  const st = useStore()
  const nav = useNav()
  const [amount, setAmount] = useState('')
  const [desc, setDesc] = useState('')
  const [ttl, setTtl] = useState(168)

  const num = parseFloat(amount) || 0
  const canSubmit = num >= LIMITS.checkMin && num <= st.balance

  return (
    <div className="screen">
      <BackHeader title="Новий чек" />

      <AmountInput value={amount} onChange={setAmount} presets={[100, 250, 500, 1000]} autoFocus />
      <div className="field-hint center">
        Доступно: {fmt(st.balance)} {TICKER}
        {num > st.balance && <span style={{ color: 'var(--red)' }}> · недостатньо коштів</span>}
      </div>

      <div className="section-label">Термін дії</div>
      <div className="segmented">
        {TTL_OPTIONS.map((o) => (
          <button
            key={o.hours}
            className={ttl === o.hours ? 'active' : ''}
            onClick={() => {
              haptic('select')
              setTtl(o.hours)
            }}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="field">
        <label className="field-label">Опис (необовʼязково)</label>
        <input
          className="input"
          placeholder="Наприклад: за каву ☕️"
          maxLength={255}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
      </div>

      <div className="spacer" />
      <button
        className="btn btn-primary"
        disabled={!canSubmit}
        onClick={() => {
          const chk = st.createCheck(num, desc.trim(), ttl)
          haptic('success')
          nav.replace({ name: 'check-detail', token: chk.token })
        }}
      >
        🧾 Створити чек {num > 0 ? `на ${fmt(num)} ${TICKER}` : ''}
      </button>
    </div>
  )
}

export function CheckDetail({ token }: { token: string }) {
  const st = useStore()
  const nav = useNav()
  const copy = useCopy()
  const chk = st.checks.find((c) => c.token === token)

  if (!chk) {
    return (
      <div className="screen">
        <BackHeader title="Чек" />
        <EmptyState emoji="🤷" title="Чек не знайдено" />
      </div>
    )
  }

  const link = checkLink(chk.token)
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(
    `🧾 Чек на ${fmt(chk.amount)} ${TICKER}${chk.description ? ` — ${chk.description}` : ''}`,
  )}`

  return (
    <div className="screen">
      <BackHeader title="Чек" />

      <div className="balance-card center">
        <div className="balance-label" style={{ justifyContent: 'center' }}>
          🧾 Чек на суму
        </div>
        <div className="balance-value" style={{ justifyContent: 'center' }}>
          {fmt(chk.amount)}
          <span className="ticker">{TICKER}</span>
        </div>
        <div style={{ marginTop: 10 }}>
          <StatusBadge status={chk.status} />
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        {chk.description && <KV k="Опис" v={chk.description} />}
        <KV k="Створено" v={fmtDate(chk.createdAt)} />
        {chk.expiresAt && chk.status === 'CREATED' && <KV k="Діє до" v={fmtDate(chk.expiresAt)} />}
        {chk.claimedBy && <KV k="Активував" v={chk.claimedBy} />}
      </div>

      {chk.status === 'CREATED' && (
        <>
          <div className="section-label">Посилання на чек</div>
          <div className="copy-box">
            <span className="addr">{link}</span>
            <button
              className="icon-btn"
              onClick={() => copy(link, 'Посилання скопійовано')}
              aria-label="Копіювати"
            >
              📋
            </button>
          </div>

          <div className="spacer" />
          <div className="btn-row">
            <button className="btn btn-primary" onClick={() => openTgLink(shareUrl)}>
              📤 Поділитися
            </button>
            <button
              className="btn btn-danger"
              onClick={() => {
                st.cancelCheck(chk.token)
                haptic('error')
                nav.pop()
              }}
            >
              ❌ Скасувати
            </button>
          </div>
          <div className="footnote">
            При скасуванні кошти миттєво повертаються на ваш баланс.
          </div>
        </>
      )}
    </div>
  )
}
