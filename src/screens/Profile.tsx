import { BackHeader, useNav } from '../nav'
import { useStore } from '../store'
import { BOT_USERNAME, LIMITS, REF_RULES, SITE_URL, SUPPORT_BOT, TICKER, fmt } from '../data'
import { KV, useCopy } from '../components'
import { openTgLink, tg, tgUser } from '../telegram'

export function Profile() {
  const st = useStore()
  const nav = useNav()
  const user = tgUser()
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Гість'

  return (
    <div className="screen">
      <div className="screen-title">👤 Профіль</div>
      <p className="screen-sub">Акаунт, ліміти та підтримка.</p>

      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div className="avatar" style={{ width: 54, height: 54, fontSize: 21 }}>
          {user?.photo_url ? <img src={user.photo_url} alt="" /> : name[0]?.toUpperCase()}
        </div>
        <div>
          <div className="row-title" style={{ fontSize: 17 }}>
            {name}
          </div>
          <div className="row-sub">
            {user?.username ? `@${user.username}` : 'Telegram'}
            {user?.id ? ` · ID ${user.id}` : ''}
          </div>
        </div>
      </div>

      <button className="row" style={{ marginTop: 12 }} onClick={() => nav.push({ name: 'referral' })}>
        <div className="row-icon tint-gold">🤝</div>
        <div className="row-body">
          <div className="row-title">Запросити друга</div>
          <div className="row-sub">Бонуси до 2% з кожної покупки друзів</div>
        </div>
        <div className="chevron">›</div>
      </button>

      <button className="row" onClick={() => nav.push({ name: 'my-certs' })}>
        <div className="row-icon tint-purple">🎫</div>
        <div className="row-body">
          <div className="row-title">Мої сертифікати</div>
          <div className="row-sub">{st.certs.length} придбано</div>
        </div>
        <div className="chevron">›</div>
      </button>

      <div className="section-label">Ліміти</div>
      <div className="card">
        <KV k="Вивід на добу" v={`${fmt(LIMITS.withdrawDailyAmount)} ${TICKER} · ${LIMITS.withdrawDailyCount} заявок`} />
        <KV k="Поповнення мобільного" v={`${fmt(LIMITS.mobileMin)} – ${fmt(LIMITS.mobileMax)} грн`} />
        <KV k="Переказ на IBAN" v={`${fmt(LIMITS.ibanMin)} – ${fmt(LIMITS.ibanMax)} грн`} />
        <KV k="Оплата рахунків" v={`${fmt(LIMITS.billMin)} – ${fmt(LIMITS.billMax)} грн`} />
      </div>

      <div className="section-label">Підтримка</div>
      <button className="row" onClick={() => openTgLink(`https://t.me/${SUPPORT_BOT}`)}>
        <div className="row-icon tint-blue">🛟</div>
        <div className="row-body">
          <div className="row-title">Звʼязатися з підтримкою</div>
          <div className="row-sub">@{SUPPORT_BOT}</div>
        </div>
        <div className="chevron">›</div>
      </button>
      <button className="row" onClick={() => (tg?.openLink ? tg.openLink(SITE_URL) : window.open(SITE_URL))}>
        <div className="row-icon tint-green">🌐</div>
        <div className="row-body">
          <div className="row-title">Про UAHe</div>
          <div className="row-sub">uahe.io — стейблкоїн гривні</div>
        </div>
        <div className="chevron">›</div>
      </button>

      <div className="spacer" />
      <button
        className="btn btn-ghost"
        onClick={() => {
          if (window.confirm('Скинути демо-дані до початкового стану?')) st.resetDemo()
        }}
      >
        🔄 Скинути демо-дані
      </button>
      <div className="footnote">
        UAHe P2P Market · демо-версія miniapp
        <br />
        Дані зберігаються локально на вашому пристрої
      </div>
    </div>
  )
}

export function Referral() {
  const st = useStore()
  const copy = useCopy()
  const user = tgUser()
  const refCode = `ref_${(user?.id ?? 42).toString(36).toUpperCase()}X7Q`
  const link = `https://t.me/${BOT_USERNAME}?start=${refCode}`
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(
    '💰 Оплачуй мобільний, рахунки та купуй сертифікати зі знижкою в UAHe P2P Market!',
  )}`

  return (
    <div className="screen">
      <BackHeader title="Запросити друга" />

      <div className="ref-hero">
        <div className="ref-emoji">🤝</div>
        <h3>Запрошуйте друзів — отримуйте {TICKER}</h3>
        <p>
          Бонуси нараховуються з кожної покупки запрошених друзів і виплачуються щомісяця — без
          обмежень у часі.
        </p>
      </div>

      <div className="ref-stats">
        <div className="ref-stat">
          <div className="rs-value">{st.refInvited}</div>
          <div className="rs-label">запрошено</div>
        </div>
        <div className="ref-stat">
          <div className="rs-value">{st.refPaying}</div>
          <div className="rs-label">купують</div>
        </div>
        <div className="ref-stat">
          <div className="rs-value">{fmt(st.refEarned)}</div>
          <div className="rs-label">{TICKER} зароблено</div>
        </div>
      </div>

      <div className="section-label">Ваші відсотки</div>
      <div className="card">
        {REF_RULES.map((r) => (
          <KV key={r.label} k={r.label} v={<b style={{ color: 'var(--uahe-gold)' }}>{r.pct}</b>} />
        ))}
        <div className="field-hint" style={{ marginTop: 8 }}>
          Виплата — кожен другий понеділок місяця, від 250 {TICKER}. До 2 500 {TICKER} з одного
          друга.
        </div>
      </div>

      <div className="section-label">Ваше посилання</div>
      <div className="copy-box">
        <span className="addr">{link}</span>
        <button className="icon-btn" onClick={() => copy(link, 'Посилання скопійовано')} aria-label="Копіювати">
          📋
        </button>
      </div>

      <div className="spacer" />
      <button className="btn btn-gold" onClick={() => openTgLink(shareUrl)}>
        📤 Поділитися посиланням
      </button>
      <div className="footnote">
        Додайте до посилання «__тег» для відстеження каналу — наприклад {refCode}__insta
      </div>
    </div>
  )
}
