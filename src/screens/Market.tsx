import { useState } from 'react'
import { BackHeader, useNav } from '../nav'
import { useStore } from '../store'
import { CERT_BRANDS, TICKER, fmt, fmtDay } from '../data'
import { Barcode, EmptyState, KV, Sheet, useCopy } from '../components'
import { haptic } from '../telegram'

export function Market() {
  const st = useStore()
  const nav = useNav()

  return (
    <div className="screen">
      <div className="screen-title">🛍 Покупки без банку</div>
      <p className="screen-sub">
        Подарункові сертифікати зі знижкою — оплата з балансу {TICKER}, без банківської картки.
      </p>

      {st.certs.length > 0 && (
        <button className="row" style={{ marginBottom: 16 }} onClick={() => nav.push({ name: 'my-certs' })}>
          <div className="row-icon tint-gold">🎫</div>
          <div className="row-body">
            <div className="row-title">Мої сертифікати</div>
            <div className="row-sub">{st.certs.length} придбано — показати коди</div>
          </div>
          <div className="chevron">›</div>
        </button>
      )}

      <div className="brand-grid">
        {CERT_BRANDS.map((b) => (
          <button key={b.code} className="brand-card" onClick={() => nav.push({ name: 'brand', code: b.code })}>
            <div className="discount-pill">−{b.discountPct}%</div>
            <div className="brand-logo" style={{ background: b.color }}>
              {b.emoji}
            </div>
            <div className="brand-title">{b.title}</div>
            <div className="brand-sub">
              від {fmt(Math.min(...b.nominals))} грн
            </div>
          </button>
        ))}
      </div>

      <div className="footnote">
        Сертифікат видається миттєво після оплати: PIN-код і штрихкод для каси.
      </div>
    </div>
  )
}

export function BrandScreen({ code }: { code: string }) {
  const st = useStore()
  const nav = useNav()
  const brand = CERT_BRANDS.find((b) => b.code === code)
  const [nominal, setNominal] = useState<number | null>(null)
  const [confirming, setConfirming] = useState(false)

  if (!brand) {
    return (
      <div className="screen">
        <BackHeader title="Сертифікати" />
        <EmptyState emoji="🤷" title="Бренд не знайдено" />
      </div>
    )
  }

  const price = nominal ? Math.round(nominal * (1 - brand.discountPct / 100) * 100) / 100 : 0
  const canBuy = nominal !== null && price <= st.balance

  return (
    <div className="screen">
      <BackHeader title={`Сертифікати ${brand.title}`} />

      <div className="card" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <div className="brand-logo" style={{ background: brand.color, marginBottom: 0 }}>
          {brand.emoji}
        </div>
        <div>
          <div className="row-title">{brand.title}</div>
          <div className="row-sub" style={{ whiteSpace: 'normal', marginTop: 4 }}>
            {brand.description}
          </div>
        </div>
      </div>

      <div className="section-label">Оберіть номінал</div>
      <div className="nominal-grid">
        {brand.nominals.map((n) => {
          const p = Math.round(n * (1 - brand.discountPct / 100) * 100) / 100
          return (
            <button
              key={n}
              className={`nominal-tile ${nominal === n ? 'selected' : ''}`}
              onClick={() => {
                haptic('select')
                setNominal(n)
              }}
            >
              <div className="nominal-value">{fmt(n)} грн</div>
              <div className="nominal-price">
                за <b>{fmt(p)} {TICKER}</b> · −{brand.discountPct}%
              </div>
            </button>
          )
        })}
      </div>

      <div className="spacer" />
      <button className="btn btn-gold" disabled={!canBuy} onClick={() => setConfirming(true)}>
        🎁 Купити {nominal ? `за ${fmt(price)} ${TICKER}` : ''}
      </button>
      {nominal !== null && price > st.balance && (
        <div className="field-hint error center" style={{ marginTop: 8 }}>
          Недостатньо коштів — доступно {fmt(st.balance)} {TICKER}
        </div>
      )}

      {confirming && nominal !== null && (
        <Sheet title="Підтвердження покупки" onClose={() => setConfirming(false)}>
          <div className="card">
            <KV k="Сертифікат" v={`${brand.title} · ${fmt(nominal)} грн`} />
            <KV k="Знижка" v={`−${brand.discountPct}%`} />
            <KV k="До списання" v={<b>{fmt(price)} {TICKER}</b>} />
          </div>
          <div className="spacer" />
          <button
            className="btn btn-gold"
            onClick={() => {
              const cert = st.buyCert(brand.code, nominal)
              haptic('success')
              setConfirming(false)
              if (cert) nav.replace({ name: 'cert', id: cert.id })
            }}
          >
            Підтвердити оплату
          </button>
        </Sheet>
      )}
    </div>
  )
}

export function MyCerts() {
  const st = useStore()
  const nav = useNav()

  return (
    <div className="screen">
      <BackHeader title="Мої сертифікати" />
      {st.certs.length === 0 && (
        <EmptyState emoji="🎫" title="Поки що порожньо" sub="Придбані сертифікати зʼявляться тут" />
      )}
      {st.certs.map((c) => (
        <button key={c.id} className="row" onClick={() => nav.push({ name: 'cert', id: c.id })}>
          <div className="row-icon" style={{ background: c.color, fontSize: 20 }}>
            {c.emoji}
          </div>
          <div className="row-body">
            <div className="row-title">
              {c.brandTitle} · {fmt(c.nominalUah)} грн
            </div>
            <div className="row-sub">діє до {fmtDay(c.expiresAt)}</div>
          </div>
          <div className="chevron">›</div>
        </button>
      ))}
    </div>
  )
}

export function CertView({ id }: { id: string }) {
  const st = useStore()
  const copy = useCopy()
  const cert = st.certs.find((c) => c.id === id)

  if (!cert) {
    return (
      <div className="screen">
        <BackHeader title="Сертифікат" />
        <EmptyState emoji="🤷" title="Сертифікат не знайдено" />
      </div>
    )
  }

  return (
    <div className="screen">
      <BackHeader title="Сертифікат" />

      <div className="voucher">
        <div className="voucher-head">
          <div className="brand-logo" style={{ background: cert.color, marginBottom: 0 }}>
            {cert.emoji}
          </div>
          <div>
            <div className="row-title" style={{ fontSize: 17 }}>
              {cert.brandTitle}
            </div>
            <div className="row-sub">
              Номінал {fmt(cert.nominalUah)} грн · сплачено {fmt(cert.priceUahe)} {TICKER}
            </div>
          </div>
        </div>
        <div className="voucher-body">
          <div className="voucher-caption">Покажіть штрихкод на касі</div>
          <Barcode value={cert.pin} />
          <div className="voucher-pin" onClick={() => copy(cert.pin.replace(/\s/g, ''), 'PIN скопійовано')}>
            {cert.pin}
          </div>
          <div className="voucher-caption">натисніть, щоб скопіювати</div>
          {cert.activationKeyName && cert.activationKeyValue && (
            <div style={{ marginTop: 14 }}>
              <div className="voucher-caption">{cert.activationKeyName}</div>
              <div
                className="voucher-pin"
                style={{ fontSize: 19, margin: '4px 0 0' }}
                onClick={() => copy(cert.activationKeyValue!, 'Код скопійовано')}
              >
                {cert.activationKeyValue}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <KV k="Придбано" v={fmtDay(cert.boughtAt)} />
        <KV k="Діє до" v={fmtDay(cert.expiresAt)} />
      </div>

      <div className="spacer" />
      <button className="btn btn-ghost" onClick={() => copy(cert.pin.replace(/\s/g, ''), 'PIN скопійовано')}>
        📋 Скопіювати PIN-код
      </button>
    </div>
  )
}
