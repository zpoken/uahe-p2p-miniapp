import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import { useNav } from '../nav'
import { fmt, fmtDate, TICKER } from '../data'
import { tgUser } from '../telegram'
import { CoinMark, Icon, ReceiptRow, WaveArt } from '../ds'
import { SectionTitle } from '../components'
import type { TileColor } from '../ds'

const OP_ICON: Record<string, { icon: string; tile: TileColor }> = {
  DEPOSIT: { icon: 'south', tile: 'lime' },
  WITHDRAWAL: { icon: 'north', tile: 'sky' },
  TRANSFER: { icon: 'swap_horiz', tile: 'violet' },
  HOLD: { icon: 'lock', tile: 'yellow' },
  CAPTURE: { icon: 'check', tile: 'lime' },
  RELEASE: { icon: 'lock_open', tile: 'lime' },
}

function useCountUp(target: number, enabled: boolean) {
  const [shown, setShown] = useState(enabled ? 0 : target)
  const raf = useRef(0)
  useEffect(() => {
    if (!enabled) {
      setShown(target)
      return
    }
    let t0: number | null = null
    const dur = 900
    const step = (t: number) => {
      if (t0 === null) t0 = t
      const p = Math.min(1, (t - t0) / dur)
      setShown(target * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
  }, [target, enabled])
  return shown
}

export default function Home() {
  const st = useStore()
  const nav = useNav()
  const [hidden, setHidden] = useState(false)
  const user = tgUser()
  const name = user?.first_name ?? 'Гість'
  const shown = useCountUp(st.balance, !hidden)

  const quick = [
    { icon: 'south', label: 'Поповнити', go: () => nav.push({ name: 'deposit' }) },
    { icon: 'north', label: 'Вивести', go: () => nav.push({ name: 'withdraw' }) },
    { icon: 'confirmation_number', label: 'Чеки', go: () => nav.push({ name: 'checks' }) },
    { icon: 'group_add', label: 'Друзі', go: () => nav.push({ name: 'referral' }) },
  ]

  const services: {
    icon: string
    tile: TileColor
    title: string
    sub: string
    go: () => void
  }[] = [
    {
      icon: 'account_balance',
      tile: 'sky',
      title: 'Переказ на IBAN/картку',
      sub: 'P2P-переказ від 5 000 грн · картка від 500 грн',
      go: () => nav.push({ name: 'iban' }),
    },
    {
      icon: 'receipt_long',
      tile: 'orange',
      title: 'Оплата товарів/послуг',
      sub: 'Оплата рахунку за фото · 5 000 – 300 000 грн',
      go: () => nav.push({ name: 'bill' }),
    },
    {
      icon: 'smartphone',
      tile: 'lime',
      title: 'Поповнення мобільного',
      sub: 'Київстар · Vodafone · lifecell',
      go: () => nav.push({ name: 'mobile' }),
    },
    {
      icon: 'local_mall',
      tile: 'violet',
      title: 'Покупки без банку',
      sub: 'Сертифікати АТБ, Сільпо, WOG зі знижкою до 15%',
      go: () => nav.setTab('market'),
    },
    {
      icon: 'local_gas_station',
      tile: 'yellow',
      title: 'Поповнити PetrolCard',
      sub: 'Паливна картка · миттєво',
      go: () => nav.push({ name: 'others', code: 'PETROLCARD' }),
    },
    {
      icon: 'package_2',
      tile: 'sky',
      title: 'Післяоплата НоваПошта',
      sub: 'Оплата накладеного платежу',
      go: () => nav.push({ name: 'others', code: 'NOVAPOST' }),
    },
  ]

  const facts = [
    { n: '0%', c: 'комісій' },
    { n: '24/7', c: 'перекази' },
    { n: '105%', c: 'забезпечення' },
  ]

  return (
    <div className="screen">
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 2px 18px' }}>
        <span className="avatar">
          {user?.photo_url ? <img src={user.photo_url} alt="" /> : name[0]?.toUpperCase()}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ font: '400 17px/1.1 var(--font-ui)', color: 'var(--ink-deep)' }}>
            Привіт, {name}
          </div>
          <div style={{ font: '400 12px/1.2 var(--font-ui)', color: 'var(--ink-60)', marginTop: 2 }}>
            UAHe P2P Market
          </div>
        </div>
        <button
          className="icon-btn"
          onClick={() => setHidden((v) => !v)}
          aria-label="Приховати баланс"
        >
          <Icon name={hidden ? 'visibility_off' : 'visibility'} size={22} />
        </button>
      </div>

      {/* balance hero */}
      <div className="panel hero">
        <WaveArt style={{ top: -6, right: -20, width: 260, height: 110 }} />
        <CoinMark size={190} watermark style={{ position: 'absolute', right: -46, bottom: -52 }} />
        <div style={{ position: 'relative' }}>
          <div style={{ font: '400 14px/1 var(--font-ui)', color: 'var(--ink-60)' }}>
            Доступний баланс
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '10px 0 12px' }}>
            <span className="mono" style={{ fontSize: 44, fontWeight: 700, color: 'var(--ink)' }}>
              {hidden ? '••••••' : fmt(shown)}
            </span>
            <span className="mono" style={{ fontSize: 20, fontWeight: 500, color: 'var(--green-accent)' }}>
              {TICKER}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span className="peg-badge">1 UAHe = 1 ₴</span>
            {st.hold > 0 && (
              <span
                className="mono"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--ink-60)',
                }}
              >
                <Icon name="lock" size={15} />
                Заблоковано: {hidden ? '••••' : fmt(st.hold)} {TICKER}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* quick actions */}
      <div className="quick-actions">
        {quick.map((q) => (
          <button key={q.label} className="quick-action" onClick={q.go}>
            <span className="icon-btn accent">
              <Icon name={q.icon} size={24} />
            </span>
            <span className="qa-label">{q.label}</span>
          </button>
        ))}
      </div>

      {/* promo banner */}
      <button className="promo-banner" style={{ width: '100%' }} onClick={() => nav.setTab('market')}>
        <span className="pb-text" style={{ textAlign: 'left' }}>
          сертифікати атб −15% _ покупки без банківської картки
        </span>
        <span className="badge chartreuse">Нове</span>
      </button>

      {/* services */}
      <SectionTitle>Послуги</SectionTitle>
      {services.map((s) => (
        <ReceiptRow
          key={s.title}
          plain
          icon={s.icon}
          tileColor={s.tile}
          label={s.title}
          subline={s.sub}
          chevron
          onClick={s.go}
        />
      ))}

      {/* recent operations */}
      {st.ops.length > 0 && (
        <>
          <SectionTitle action="Усі →" onAction={() => nav.setTab('history')}>
            Останні операції
          </SectionTitle>
          {st.ops.slice(0, 3).map((op) => {
            const meta = OP_ICON[op.kind] ?? OP_ICON.TRANSFER
            return (
              <ReceiptRow
                key={op.id}
                icon={meta.icon}
                tileColor={meta.tile}
                label={op.title}
                subline={fmtDate(op.createdAt)}
                amount={op.amount === 0 ? undefined : fmt(op.amount)}
                positive={op.amount > 0}
              />
            )
          })}
        </>
      )}

      {/* facts strip */}
      <div className="facts-strip">
        {facts.map((f) => (
          <div key={f.n} className="fact">
            <div className="f-n">{f.n}</div>
            <div className="f-c">{f.c}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
