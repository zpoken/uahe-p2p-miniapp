import { useState } from 'react'
import { BackHeader, useNav } from '../nav'
import { useStore } from '../store'
import { BOT_USERNAME, LIMITS, TICKER, fmt, fmtDate } from '../data'
import { AmountInput, CopyBox, EmptyState, KV, StatusBadge } from '../components'
import { haptic, openTgLink } from '../telegram'
import { Icon, ReceiptRow, Segmented } from '../ds'

const TTL_OPTIONS = [
  { key: '24', label: '1 день' },
  { key: '72', label: '3 дні' },
  { key: '168', label: '7 днів' },
  { key: '720', label: '30 днів' },
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

      <div className="panel" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <span className="icon-btn accent" style={{ pointerEvents: 'none' }}>
          <Icon name="confirmation_number" size={24} />
        </span>
        <div style={{ font: '400 13.5px/1.5 var(--font-ui)', color: 'var(--ink-70)' }}>
          Чек — це посилання з сумою в {TICKER}: поділіться ним, і отримувач миттєво отримає кошти.
        </div>
      </div>

      <div className="spacer" />
      <button className="btn btn-accent" onClick={() => nav.push({ name: 'check-create' })}>
        <Icon name="add" size={20} />
        Створити чек
      </button>

      {st.checks.length === 0 ? (
        <EmptyState title="Чеків ще немає" sub="Створіть перший чек і поділіться ним" />
      ) : (
        <>
          <div className="spacer" />
          {st.checks.map((c) => (
            <ReceiptRow
              key={c.token}
              icon="confirmation_number"
              tileColor={c.status === 'CREATED' ? 'lime' : 'sky'}
              label={`${fmt(c.amount)} ${TICKER}`}
              subline={c.description || fmtDate(c.createdAt)}
              badge={<StatusBadge status={c.status} />}
              onClick={() => nav.push({ name: 'check-detail', token: c.token })}
            />
          ))}
        </>
      )}
    </div>
  )
}

export function CheckCreate() {
  const st = useStore()
  const nav = useNav()
  const [amount, setAmount] = useState('')
  const [desc, setDesc] = useState('')
  const [ttl, setTtl] = useState('168')

  const num = parseFloat(amount) || 0
  const canSubmit = num >= LIMITS.checkMin && num <= st.balance

  return (
    <div className="screen">
      <BackHeader title="Новий чек" />

      <AmountInput value={amount} onChange={setAmount} presets={[100, 250, 500, 1000]} autoFocus />
      <div className="field-hint mono-hint center">
        Доступно: {fmt(st.balance)} {TICKER}
        {num > st.balance && <span style={{ color: 'var(--error)' }}> · недостатньо коштів</span>}
      </div>

      <div className="spacer" />
      <span className="field-label">Термін дії</span>
      <Segmented options={TTL_OPTIONS} value={ttl} onChange={setTtl} />

      <div className="field">
        <label className="field-label">Опис (необовʼязково)</label>
        <input
          className="input"
          placeholder="Наприклад: за каву"
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
          const chk = st.createCheck(num, desc.trim(), Number(ttl))
          haptic('success')
          nav.replace({ name: 'check-detail', token: chk.token })
        }}
      >
        Створити чек {num > 0 ? `на ${fmt(num)} ${TICKER}` : ''}
      </button>
    </div>
  )
}

export function CheckDetail({ token }: { token: string }) {
  const st = useStore()
  const nav = useNav()
  const chk = st.checks.find((c) => c.token === token)

  if (!chk) {
    return (
      <div className="screen">
        <BackHeader title="Чек" />
        <EmptyState title="Чек не знайдено" />
      </div>
    )
  }

  const link = checkLink(chk.token)
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(
    `Чек на ${fmt(chk.amount)} ${TICKER}${chk.description ? ` — ${chk.description}` : ''}`,
  )}`

  return (
    <div className="screen">
      <BackHeader title="Чек" />

      <div className="panel hero center">
        <div style={{ font: '400 14px/1 var(--font-ui)', color: 'var(--ink-60)' }}>Чек на суму</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, justifyContent: 'center', margin: '12px 0' }}>
          <span className="mono" style={{ fontSize: 40, fontWeight: 700 }}>
            {fmt(chk.amount)}
          </span>
          <span className="mono" style={{ fontSize: 18, fontWeight: 500, color: 'var(--green-accent)' }}>
            {TICKER}
          </span>
        </div>
        <StatusBadge status={chk.status} />
      </div>

      <div className="spacer" />
      <div className="panel">
        {chk.description && <KV k="Опис" v={chk.description} />}
        <KV k="Створено" v={fmtDate(chk.createdAt)} />
        {chk.expiresAt && chk.status === 'CREATED' && <KV k="Діє до" v={fmtDate(chk.expiresAt)} />}
        {chk.claimedBy && <KV k="Активував" v={chk.claimedBy} />}
      </div>

      {chk.status === 'CREATED' && (
        <>
          <div className="spacer" />
          <CopyBox label="Посилання на чек" value={link} note="Посилання скопійовано" />

          <div className="spacer" />
          <div className="btn-row">
            <button className="btn btn-primary" onClick={() => openTgLink(shareUrl)}>
              <Icon name="share" size={19} />
              Поділитися
            </button>
            <button
              className="btn btn-danger"
              onClick={() => {
                st.cancelCheck(chk.token)
                haptic('error')
                nav.pop()
              }}
            >
              Скасувати
            </button>
          </div>
          <div className="footnote">При скасуванні кошти миттєво повертаються на ваш баланс.</div>
        </>
      )}
    </div>
  )
}
