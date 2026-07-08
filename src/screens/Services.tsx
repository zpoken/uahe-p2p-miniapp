import { useMemo, useState } from 'react'
import { BackHeader, useNav } from '../nav'
import { useStore } from '../store'
import { LIMITS, OPERATORS, OTHER_SERVICES, TICKER, fmt } from '../data'
import { AmountInput, KV, Sheet, StatusBadge } from '../components'
import { haptic } from '../telegram'
import { Icon, IconTile, Segmented } from '../ds'
import type { ServiceRequest } from '../types'

// ETA logic mirrors the bot: weekday daytime 45 min, night/weekend 90 min.
function etaMinutes(): number {
  const d = new Date()
  const h = d.getHours()
  const wd = d.getDay()
  if (h >= 22 || h < 8) return 90
  if (wd === 0 || wd === 6) return 90
  return 45
}

export function RequestSuccess({ req, onClose }: { req: ServiceRequest; onClose: () => void }) {
  return (
    <Sheet onClose={onClose}>
      <div className="success-pop">
        <Icon name="mark_email_read" size={38} />
      </div>
      <h3 className="center">Заявку №{req.id} створено</h3>
      <div className="panel">
        <KV k="Послуга" v={req.title} />
        {Object.entries(req.details).map(([k, v]) => (
          <KV key={k} k={k} v={v} />
        ))}
        <KV k="Сума" v={`${fmt(req.amountUah)} грн`} />
        {req.feeUahe ? <KV k="Комісія" v={`${fmt(req.feeUahe)} ${TICKER}`} /> : null}
        <KV k="Статус" v={<StatusBadge status={req.status} />} />
      </div>
      <div className="footnote" style={{ margin: '12px 0 16px' }}>
        Орієнтовний час виконання — до {etaMinutes()} хв. Кошти буде заблоковано після прийняття
        заявки мерчантом.
      </div>
      <button className="btn btn-primary" onClick={onClose}>
        Зрозуміло
      </button>
    </Sheet>
  )
}

// ---------- Mobile top-up ----------

export function MobileTopup() {
  const st = useStore()
  const nav = useNav()
  const [operator, setOperator] = useState(OPERATORS[0].code)
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [done, setDone] = useState<ServiceRequest | null>(null)

  const op = OPERATORS.find((o) => o.code === operator)!
  const phoneDigits = phone.replace(/\D/g, '')
  const phoneOk = /^0\d{9}$/.test(phoneDigits)
  const num = parseFloat(amount) || 0
  const amountOk = num >= LIMITS.mobileMin && num <= LIMITS.mobileMax
  const canSubmit = phoneOk && amountOk && num <= st.balance

  return (
    <div className="screen">
      <BackHeader title="Поповнення мобільного" gradientWord="мобільного" />

      <span className="field-label">Оператор</span>
      <Segmented
        options={OPERATORS.map((o) => ({ key: o.code, label: o.title, dot: o.color }))}
        value={operator}
        onChange={setOperator}
      />

      <div className="field">
        <label className="field-label">Номер телефону</label>
        <input
          className={`input mono ${phone && !phoneOk ? 'input-error' : ''}`}
          inputMode="tel"
          placeholder="0XX XXX XX XX"
          maxLength={13}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        {phone && !phoneOk && (
          <div className="field-hint error">Введіть 10 цифр у форматі 0XXXXXXXXX</div>
        )}
      </div>

      <AmountInput value={amount} onChange={setAmount} presets={[300, 500, 1000, 2000]} ticker="грн" />
      <div className="field-hint mono-hint center">
        від {fmt(LIMITS.mobileMin)} до {fmt(LIMITS.mobileMax)} грн _ 1 грн = 1 {TICKER}
      </div>

      <div className="spacer" />
      <button
        className="btn btn-primary"
        disabled={!canSubmit}
        onClick={() => {
          const req = st.createRequest('MOBILE_TOPUP', 'Поповнення мобільного', num, {
            Оператор: op.title,
            Телефон: phoneDigits.replace(/(\d{3})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4'),
          })
          haptic('success')
          setDone(req)
        }}
      >
        Поповнити {num > 0 ? `на ${fmt(num)} грн` : ''}
      </button>

      {done && <RequestSuccess req={done} onClose={() => (setDone(null), nav.pop())} />}
    </div>
  )
}

// ---------- IBAN / card transfer ----------

function validIban(v: string): boolean {
  return /^UA\d{27}$/.test(v.replace(/\s/g, '').toUpperCase())
}

function validTin(v: string): boolean {
  return /^\d{10}$/.test(v)
}

function luhnOk(pan: string): boolean {
  const digits = pan.replace(/\D/g, '')
  if (digits.length !== 16) return false
  let sum = 0
  for (let i = 0; i < 16; i++) {
    let d = Number(digits[15 - i])
    if (i % 2 === 1) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
  }
  return sum % 10 === 0
}

export function IbanTransfer() {
  const st = useStore()
  const nav = useNav()
  const [method, setMethod] = useState<'IBAN' | 'CARD'>('IBAN')
  const [iban, setIban] = useState('')
  const [tin, setTin] = useState('')
  const [payee, setPayee] = useState('')
  const [pan, setPan] = useState('')
  const [amount, setAmount] = useState('')
  const [done, setDone] = useState<ServiceRequest | null>(null)

  const num = parseFloat(amount) || 0
  const isIban = method === 'IBAN'
  const min = isIban ? LIMITS.ibanMin : LIMITS.cardMin
  const max = isIban ? LIMITS.ibanMax : LIMITS.cardMax
  const fee = !isIban && num > 0 && num < LIMITS.cardFeeThreshold ? LIMITS.cardFee : 0

  const fieldsOk = isIban
    ? validIban(iban) && validTin(tin) && payee.trim().length >= 3
    : luhnOk(pan)
  const amountOk = num >= min && num <= max
  const canSubmit = fieldsOk && amountOk && num + fee <= st.balance

  const submit = () => {
    const details: Record<string, string> = isIban
      ? {
          IBAN: iban.replace(/\s/g, '').toUpperCase(),
          'РНОКПП (ІПН)': tin,
          Отримувач: payee.trim(),
        }
      : { Картка: pan.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ') }
    const req = st.createRequest(
      isIban ? 'IBAN_P2P' : 'CARD_P2P',
      isIban ? 'Переказ на IBAN' : 'Переказ на картку',
      num,
      details,
      fee || undefined,
    )
    haptic('success')
    setDone(req)
  }

  return (
    <div className="screen">
      <BackHeader title="Переказ на IBAN/картку" gradientWord="Переказ" />

      <Segmented
        options={[
          { key: 'IBAN', label: 'За IBAN' },
          { key: 'CARD', label: 'За номером картки' },
        ]}
        value={method}
        onChange={(k) => setMethod(k as 'IBAN' | 'CARD')}
      />

      {isIban ? (
        <>
          <div className="field">
            <label className="field-label">IBAN отримувача</label>
            <input
              className={`input mono ${iban && !validIban(iban) ? 'input-error' : ''}`}
              placeholder="UA00 0000 0000 0000 0000 0000 000"
              value={iban}
              onChange={(e) => setIban(e.target.value)}
              autoCapitalize="characters"
              spellCheck={false}
            />
            {iban && !validIban(iban) && <div className="field-hint error">Формат: UA + 27 цифр</div>}
          </div>
          <div className="field">
            <label className="field-label">РНОКПП (ІПН) отримувача</label>
            <input
              className={`input mono ${tin && !validTin(tin) ? 'input-error' : ''}`}
              inputMode="numeric"
              placeholder="10 цифр"
              maxLength={10}
              value={tin}
              onChange={(e) => setTin(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          <div className="field">
            <label className="field-label">ПІБ отримувача</label>
            <input
              className="input"
              placeholder="Прізвище Імʼя По батькові"
              maxLength={200}
              value={payee}
              onChange={(e) => setPayee(e.target.value)}
            />
          </div>
        </>
      ) : (
        <div className="field">
          <label className="field-label">Номер картки (Visa / Mastercard)</label>
          <input
            className={`input mono ${pan && !luhnOk(pan) ? 'input-error' : ''}`}
            inputMode="numeric"
            placeholder="0000 0000 0000 0000"
            maxLength={19}
            value={pan}
            onChange={(e) =>
              setPan(
                e.target.value
                  .replace(/\D/g, '')
                  .slice(0, 16)
                  .replace(/(\d{4})(?=\d)/g, '$1 '),
              )
            }
          />
          {pan && !luhnOk(pan) && (
            <div className="field-hint error">Перевірте номер картки — 16 цифр</div>
          )}
        </div>
      )}

      <AmountInput
        value={amount}
        onChange={setAmount}
        presets={isIban ? [5000, 10000, 50000] : [1000, 5000, 10000]}
        ticker="грн"
      />
      <div className="field-hint mono-hint center">
        від {fmt(min)} до {fmt(max)} грн
      </div>
      {fee > 0 && (
        <div className="warning-panel">
          комісія {fmt(fee)} {TICKER} _ безкоштовно від {fmt(LIMITS.cardFeeThreshold)} грн
          <br />
          до списання: {fmt(num + fee)} {TICKER}
        </div>
      )}

      <div className="spacer" />
      <button className="btn btn-primary" disabled={!canSubmit} onClick={submit}>
        Сплатити {num > 0 ? `${fmt(num)} грн` : ''}
      </button>

      {done && <RequestSuccess req={done} onClose={() => (setDone(null), nav.pop())} />}
    </div>
  )
}

// ---------- Bill scan ----------

export function BillScan() {
  const st = useStore()
  const nav = useNav()
  const [fileName, setFileName] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [done, setDone] = useState<ServiceRequest | null>(null)

  const num = parseFloat(amount) || 0
  const amountOk = num >= LIMITS.billMin && num <= LIMITS.billMax
  const canSubmit = Boolean(fileName) && amountOk && num <= st.balance

  return (
    <div className="screen">
      <BackHeader title="Оплата товарів/послуг" gradientWord="Оплата" />
      <p className="screen-sub">рахунок за фото _ мерчант сплачує _ ви отримуєте квитанцію</p>

      <label className="dropzone">
        {preview ? (
          <img
            src={preview}
            alt="Рахунок"
            style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 16 }}
          />
        ) : (
          <>
            <span className="icon-btn accent" style={{ pointerEvents: 'none' }}>
              <Icon name="upload_file" size={24} />
            </span>
            <div style={{ font: '400 15px/1.3 var(--font-ui)', color: 'var(--ink)', marginTop: 12 }}>
              {fileName ?? 'Додати фото або PDF рахунку'}
            </div>
            <div style={{ font: '400 13px/1.4 var(--font-ui)', color: 'var(--ink-50)', marginTop: 4 }}>
              Натисніть, щоб обрати файл
            </div>
          </>
        )}
        <input
          type="file"
          accept="image/*,.pdf"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (!f) return
            setFileName(f.name)
            haptic('tap')
            if (f.type.startsWith('image/')) {
              setPreview(URL.createObjectURL(f))
            } else {
              setPreview(null)
            }
          }}
        />
      </label>
      {fileName && (
        <div className="field-hint mono-hint center" style={{ marginTop: 8 }}>
          {fileName}
        </div>
      )}

      <AmountInput value={amount} onChange={setAmount} presets={[5000, 10000, 25000]} ticker="грн" />
      <div className="field-hint mono-hint center">
        від {fmt(LIMITS.billMin)} до {fmt(LIMITS.billMax)} грн
      </div>

      <div className="spacer" />
      <button
        className="btn btn-primary"
        disabled={!canSubmit}
        onClick={() => {
          const req = st.createRequest('BILL_SCAN', 'Оплата товарів/послуг', num, {
            Рахунок: fileName ?? '—',
          })
          haptic('success')
          setDone(req)
        }}
      >
        Сплатити рахунок {num > 0 ? `на ${fmt(num)} грн` : ''}
      </button>

      {done && <RequestSuccess req={done} onClose={() => (setDone(null), nav.pop())} />}
    </div>
  )
}

// ---------- Other services (PetrolCard, Nova Poshta COD) ----------

export function OtherService({ code }: { code: string }) {
  const st = useStore()
  const nav = useNav()
  const svc = useMemo(() => OTHER_SERVICES.find((s) => s.code === code) ?? OTHER_SERVICES[0], [code])
  const [account, setAccount] = useState('')
  const [amount, setAmount] = useState('')
  const [done, setDone] = useState<ServiceRequest | null>(null)

  const num = parseFloat(amount) || 0
  const accountOk = account.trim().length >= 4
  const canSubmit = accountOk && num >= svc.min && num <= svc.max && num <= st.balance

  return (
    <div className="screen">
      <BackHeader title={svc.title} />

      <div className="panel" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <IconTile icon={svc.icon} color={svc.tile} size={48} />
        <div style={{ font: '500 13px/1.5 var(--font-mono)', letterSpacing: 0, color: 'var(--ink-60)' }}>
          від {fmt(svc.min)} до {fmt(svc.max)} грн _ оплата з балансу {TICKER}
        </div>
      </div>

      <div className="field" style={{ marginTop: 16 }}>
        <label className="field-label">{svc.accountTitle}</label>
        <input
          className="input mono"
          placeholder={svc.accountPrompt}
          value={account}
          onChange={(e) => setAccount(e.target.value)}
        />
      </div>

      <AmountInput value={amount} onChange={setAmount} presets={[500, 1000, 2000]} ticker="грн" />

      <div className="spacer" />
      <button
        className="btn btn-primary"
        disabled={!canSubmit}
        onClick={() => {
          const req = st.createRequest('OTHERS', svc.title, num, {
            [svc.accountTitle]: account.trim(),
          })
          haptic('success')
          setDone(req)
        }}
      >
        Сплатити {num > 0 ? `${fmt(num)} грн` : ''}
      </button>

      {done && <RequestSuccess req={done} onClose={() => (setDone(null), nav.pop())} />}
    </div>
  )
}
