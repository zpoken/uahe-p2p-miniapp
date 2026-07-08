import { useState } from 'react'
import { useStore } from '../store'
import { useNav } from '../nav'
import { fmt, fmtDate, TICKER } from '../data'
import { tgUser } from '../telegram'

export default function Home() {
  const st = useStore()
  const nav = useNav()
  const [hideBalance, setHideBalance] = useState(false)
  const user = tgUser()
  const name = user?.first_name ?? 'Гість'

  const services = [
    {
      icon: '🏦',
      tint: 'tint-blue',
      title: 'Переказ на IBAN/картку',
      sub: 'P2P-переказ від 5 000 грн · картка від 500 грн',
      go: () => nav.push({ name: 'iban' }),
    },
    {
      icon: '🧾',
      tint: 'tint-gold',
      title: 'Оплата товарів/послуг',
      sub: 'Оплата рахунку за фото · 5 000 – 300 000 грн',
      go: () => nav.push({ name: 'bill' }),
    },
    {
      icon: '📱',
      tint: 'tint-green',
      title: 'Поповнення мобільного',
      sub: 'Київстар · Vodafone · lifecell',
      go: () => nav.push({ name: 'mobile' }),
    },
    {
      icon: '🛍',
      tint: 'tint-purple',
      title: 'Покупки без банку',
      sub: 'Сертифікати АТБ, Сільпо, WOG зі знижкою до 15%',
      go: () => nav.setTab('market'),
    },
    {
      icon: '⛽️',
      tint: 'tint-red',
      title: 'Поповнити PetrolCard',
      sub: 'Паливна картка · миттєво',
      go: () => nav.push({ name: 'others', code: 'PETROLCARD' }),
    },
    {
      icon: '📦',
      tint: 'tint-blue',
      title: 'Післяоплата НоваПошта',
      sub: 'Оплата накладеного платежу',
      go: () => nav.push({ name: 'others', code: 'NOVAPOST' }),
    },
  ]

  const recentOps = st.ops.slice(0, 3)

  return (
    <div className="screen">
      <div className="app-header">
        <div className="avatar">
          {user?.photo_url ? <img src={user.photo_url} alt="" /> : name[0]?.toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div className="header-name">Привіт, {name} 👋</div>
          <div className="header-caption">UAHe P2P Market</div>
        </div>
        <button
          className="icon-btn"
          onClick={() => setHideBalance((v) => !v)}
          aria-label="Приховати баланс"
        >
          {hideBalance ? '🙈' : '👁'}
        </button>
      </div>

      <div className="balance-card">
        <div className="balance-label">💰 Доступний баланс</div>
        <div className="balance-value">
          {hideBalance ? '••••••' : fmt(st.balance)}
          <span className="ticker">{TICKER}</span>
        </div>
        {st.hold > 0 && (
          <div className="balance-hold">
            ⏳ Заблоковано в заявках: <b>{hideBalance ? '•••' : fmt(st.hold)}</b> {TICKER}
          </div>
        )}
      </div>

      <div className="quick-actions">
        <button className="quick-action" onClick={() => nav.push({ name: 'deposit' })}>
          <div className="qa-icon">⬇️</div>
          <span>Поповнити</span>
        </button>
        <button className="quick-action" onClick={() => nav.push({ name: 'withdraw' })}>
          <div className="qa-icon">⬆️</div>
          <span>Вивести</span>
        </button>
        <button className="quick-action" onClick={() => nav.push({ name: 'checks' })}>
          <div className="qa-icon">🧾</div>
          <span>Чеки</span>
        </button>
        <button className="quick-action" onClick={() => nav.push({ name: 'referral' })}>
          <div className="qa-icon">🤝</div>
          <span>Друзі</span>
        </button>
      </div>

      <div className="promo-banner" onClick={() => nav.setTab('market')}>
        <div className="pb-emoji">🎁</div>
        <div className="pb-text">
          Сертифікати АТБ зі знижкою <b>−15%</b> — покупки в супермаркеті без банківської картки
        </div>
      </div>

      <div className="section-label">Послуги</div>
      {services.map((s) => (
        <button key={s.title} className="row" onClick={s.go}>
          <div className={`row-icon ${s.tint}`}>{s.icon}</div>
          <div className="row-body">
            <div className="row-title">{s.title}</div>
            <div className="row-sub">{s.sub}</div>
          </div>
          <div className="chevron">›</div>
        </button>
      ))}

      {recentOps.length > 0 && (
        <>
          <div className="section-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Останні операції</span>
            <span
              style={{ color: 'var(--uahe-blue)', cursor: 'pointer' }}
              onClick={() => nav.setTab('history')}
            >
              Усі ›
            </span>
          </div>
          {recentOps.map((op) => (
            <div key={op.id} className="row">
              <div className={`row-icon ${op.amount >= 0 ? 'tint-green' : 'tint-blue'}`}>
                {op.amount >= 0 ? '⬇️' : '⬆️'}
              </div>
              <div className="row-body">
                <div className="row-title">{op.title}</div>
                <div className="row-sub">{fmtDate(op.createdAt)}</div>
              </div>
              <div className="row-end">
                <div className={`row-amount ${op.amount >= 0 ? 'pos' : 'neg'}`}>
                  {op.amount >= 0 ? '+' : ''}
                  {fmt(op.amount)}
                </div>
                <div className="row-caption">{TICKER}</div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
