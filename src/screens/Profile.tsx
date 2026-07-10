import { BackHeader, useNav } from '../nav'
import { useStore } from '../store'
import { BOT_USERNAME, LIMITS, REF_RULES, SITE_URL, SUPPORT_BOT, TICKER, fmt } from '../data'
import { CopyBox, GradTitle, KV, SectionTitle } from '../components'
import { openTgLink, tg, tgUser } from '../telegram'
import { Icon, ReceiptRow, WaveArt } from '../ds'

export function Profile() {
  const st = useStore()
  const nav = useNav()
  const user = tgUser()
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Гість'

  return (
    <div className="screen">
      <div className="screen-title">Профіль</div>
      <p className="screen-sub">акаунт _ ліміти _ підтримка</p>

      <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span className="avatar" style={{ width: 54, height: 54, fontSize: 21 }}>
          {user?.photo_url ? <img src={user.photo_url} alt="" /> : name[0]?.toUpperCase()}
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ font: '400 17px/1.2 var(--font-ui)', color: 'var(--ink-deep)' }}>{name}</div>
          <div className="mono" style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink-60)', marginTop: 4 }}>
            {user?.username ? `@${user.username}` : 'telegram'}
            {user?.id ? ` · ID ${user.id}` : ''}
          </div>
        </div>
      </div>

      <div className="spacer" />
      <ReceiptRow
        plain
        icon="group_add"
        tileColor="lime"
        label="Запросити друга"
        subline="Бонуси до 2% з кожної покупки друзів"
        chevron
        onClick={() => nav.push({ name: 'referral' })}
      />
      <ReceiptRow
        plain
        icon="confirmation_number"
        tileColor="violet"
        label="Мої сертифікати"
        subline={`${st.certs.length} придбано`}
        chevron
        onClick={() => nav.push({ name: 'my-certs' })}
      />

      <SectionTitle>Ліміти</SectionTitle>
      <div className="panel">
        <KV
          k="Вивід на добу"
          v={`${fmt(LIMITS.withdrawDailyAmount)} ${TICKER} · ${LIMITS.withdrawDailyCount} заявок`}
        />
        <KV k="Поповнення мобільного" v={`${fmt(LIMITS.mobileMin)} – ${fmt(LIMITS.mobileMax)} грн`} />
        <KV k="Переказ на IBAN" v={`${fmt(LIMITS.ibanMin)} – ${fmt(LIMITS.ibanMax)} грн`} />
        <KV k="Оплата рахунків" v={`${fmt(LIMITS.billMin)} – ${fmt(LIMITS.billMax)} грн`} />
      </div>

      <SectionTitle>Підтримка</SectionTitle>
      <ReceiptRow
        plain
        icon="support_agent"
        tileColor="sky"
        label="Звʼязатися з підтримкою"
        subline={`@${SUPPORT_BOT}`}
        chevron
        onClick={() => openTgLink(`https://t.me/${SUPPORT_BOT}`)}
      />
      <ReceiptRow
        plain
        icon="language"
        tileColor="lime"
        label="Про UAHe"
        subline="uahe.io — стейблкоїн гривні"
        chevron
        onClick={() => (tg?.openLink ? tg.openLink(SITE_URL) : window.open(SITE_URL))}
      />

      <div className="spacer" />
      <button
        className="btn btn-ghost"
        onClick={() => {
          if (st.apiMode) st.resetDemo()
          else if (window.confirm('Скинути демо-дані до початкового стану?')) st.resetDemo()
        }}
      >
        <Icon name="restart_alt" size={19} />
        {st.apiMode ? 'Оновити дані' : 'Скинути демо-дані'}
      </button>
      <div className="tagline" style={{ marginTop: 18 }}>
        {st.apiMode ? 'uahe p2p market' : 'uahe p2p market _ демо-версія'}
        <br />
        {st.apiMode ? 'дані з вашого акаунта в боті' : 'дані зберігаються локально'}
      </div>
    </div>
  )
}

export function Referral() {
  const st = useStore()
  const user = tgUser()
  const refCode = `ref_${(user?.id ?? 42).toString(36).toUpperCase()}X7Q`
  const link = `https://t.me/${BOT_USERNAME}?start=${refCode}`
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(
    'Оплачуйте мобільний, рахунки та купуйте сертифікати зі знижкою в UAHe P2P Market',
  )}`

  return (
    <div className="screen">
      <BackHeader title="Запросити друга" />

      <div className="ref-hero">
        <WaveArt style={{ top: -8, left: -30, width: 300, height: 110 }} />
        <WaveArt style={{ bottom: -40, right: -50, width: 280, height: 110, transform: 'scaleX(-1)' }} />
        <h3>
          <GradTitle title="Запрошуйте друзів — заробляйте UAHe" word="заробляйте" />
        </h3>
        <p>Бонуси з кожної покупки запрошених друзів, виплати щомісяця — без обмежень у часі.</p>
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

      <SectionTitle>Ваші відсотки</SectionTitle>
      <div className="panel">
        {REF_RULES.map((r) => (
          <KV key={r.label} k={r.label} v={<b style={{ color: 'var(--green-accent)' }}>{r.pct}</b>} />
        ))}
        <div className="field-hint mono-hint" style={{ marginTop: 10 }}>
          виплата — кожен 2-й понеділок _ від 250 uahe _ до 2 500 uahe з одного друга
        </div>
      </div>

      <div className="spacer" />
      <CopyBox label="Ваше посилання" value={link} note="Посилання скопійовано" />

      <div className="spacer" />
      <button className="btn btn-accent" onClick={() => openTgLink(shareUrl)}>
        <Icon name="share" size={19} />
        Поділитися посиланням
      </button>
      <div className="footnote">
        Додайте до посилання «__тег» для відстеження каналу — наприклад {refCode}__insta
      </div>
    </div>
  )
}
