import { useState } from 'react'
import { BackHeader, useNav } from '../nav'
import { useStore } from '../store'
import { CERT_BRANDS, TICKER, fmt, fmtDay } from '../data'
import { EmptyState, GradTitle, KV, Sheet, useCopy } from '../components'
import { haptic } from '../telegram'
import { Barcode, Icon, ReceiptRow } from '../ds'

function BrandLogo({ icon, color, size = 52 }: { icon: string; color: string; size?: number }) {
  return (
    <span
      className="brand-tile"
      style={{ background: color, width: size, height: size, marginBottom: 0 }}
    >
      <Icon name={icon} size={Math.round(size * 0.5)} color="#fff" />
    </span>
  )
}

export function Market() {
  const st = useStore()
  const nav = useNav()

  return (
    <div className="screen">
      <div className="screen-title">
        <GradTitle title="Покупки без банку" word="без банку" />
      </div>
      <p className="screen-sub">сертифікати зі знижкою _ оплата з балансу uahe</p>

      {st.certs.length > 0 && (
        <>
          <ReceiptRow
            icon="confirmation_number"
            tileColor="violet"
            label="Мої сертифікати"
            subline={`${st.certs.length} придбано — показати коди`}
            chevron
            onClick={() => nav.push({ name: 'my-certs' })}
          />
          <div className="spacer" />
        </>
      )}

      <div className="brand-grid">
        {CERT_BRANDS.map((b) => (
          <button
            key={b.code}
            className="brand-card"
            onClick={() => nav.push({ name: 'brand', code: b.code })}
          >
            <span className="discount-pill">−{b.discountPct}%</span>
            <span className="brand-tile" style={{ background: b.color }}>
              <Icon name={b.icon} size={26} color="#fff" />
            </span>
            <div className="brand-title">{b.title}</div>
            <div className="brand-sub">від {fmt(Math.min(...b.nominals))} грн</div>
          </button>
        ))}
      </div>

      <div className="footnote mono-note">
        сертифікат видається миттєво _ pin-код і штрихкод для каси
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
        <EmptyState title="Бренд не знайдено" />
      </div>
    )
  }

  const price = nominal ? Math.round(nominal * (1 - brand.discountPct / 100) * 100) / 100 : 0
  const canBuy = nominal !== null && price <= st.balance

  return (
    <div className="screen">
      <BackHeader title={`Сертифікати ${brand.title}`} />

      <div className="panel" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <BrandLogo icon={brand.icon} color={brand.color} />
        <div>
          <div style={{ font: '400 15px/1.2 var(--font-ui)', color: 'var(--ink)' }}>{brand.title}</div>
          <div
            style={{
              font: '400 12.5px/1.5 var(--font-ui)',
              color: 'var(--ink-60)',
              marginTop: 5,
            }}
          >
            {brand.description}
          </div>
        </div>
      </div>

      <div className="spacer" />
      <span className="field-label">Оберіть номінал</span>
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
      <button className="btn btn-accent" disabled={!canBuy} onClick={() => setConfirming(true)}>
        Купити {nominal ? `за ${fmt(price)} ${TICKER}` : ''}
      </button>
      {nominal !== null && price > st.balance && (
        <div className="field-hint error center" style={{ marginTop: 8 }}>
          Недостатньо коштів — доступно {fmt(st.balance)} {TICKER}
        </div>
      )}

      {confirming && nominal !== null && (
        <Sheet title="Підтвердження покупки" onClose={() => setConfirming(false)}>
          <div className="panel">
            <KV k="Сертифікат" v={`${brand.title} · ${fmt(nominal)} грн`} />
            <KV k="Знижка" v={`−${brand.discountPct}%`} />
            <KV k="До списання" v={<b>{fmt(price)} {TICKER}</b>} />
          </div>
          <div className="spacer" />
          <button
            className="btn btn-accent"
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
        <EmptyState title="Поки що порожньо" sub="Придбані сертифікати зʼявляться тут" />
      )}
      {st.certs.map((c) => (
        <ReceiptRow
          key={c.id}
          leading={<BrandLogo icon={c.icon} color={c.color} size={40} />}
          label={`${c.brandTitle} · ${fmt(c.nominalUah)} грн`}
          subline={`діє до ${fmtDay(c.expiresAt)}`}
          chevron
          plain
          onClick={() => nav.push({ name: 'cert', id: c.id })}
        />
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
        <EmptyState title="Сертифікат не знайдено" />
      </div>
    )
  }

  return (
    <div className="screen">
      <BackHeader title="Сертифікат" />

      <div className="voucher">
        <div className="voucher-head">
          <BrandLogo icon={cert.icon} color={cert.color} />
          <div>
            <div className="vh-title">{cert.brandTitle}</div>
            <div className="vh-sub">
              Номінал {fmt(cert.nominalUah)} грн · сплачено {fmt(cert.priceUahe)} {TICKER}
            </div>
          </div>
        </div>
        <div className="voucher-body">
          <div className="voucher-caption">Покажіть штрихкод на касі</div>
          <Barcode value={cert.pin} />
          <div
            className="voucher-pin"
            onClick={() => copy(cert.pin.replace(/\s/g, ''), 'PIN скопійовано')}
          >
            {cert.pin}
          </div>
          <div className="voucher-caption">Натисніть, щоб скопіювати</div>
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

      <div className="spacer" />
      <div className="panel">
        <KV k="Придбано" v={fmtDay(cert.boughtAt)} />
        <KV k="Діє до" v={fmtDay(cert.expiresAt)} />
      </div>

      <div className="spacer" />
      <button
        className="btn btn-secondary"
        onClick={() => copy(cert.pin.replace(/\s/g, ''), 'PIN скопійовано')}
      >
        <Icon name="content_copy" size={19} />
        Скопіювати PIN-код
      </button>
    </div>
  )
}
