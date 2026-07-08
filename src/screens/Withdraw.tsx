import { useMemo, useState } from 'react'
import { BackHeader, useNav } from '../nav'
import { CHAINS, LIMITS, TICKER, fmt } from '../data'
import { useStore } from '../store'
import { KV, Sheet, StatusBadge } from '../components'
import { haptic } from '../telegram'
import type { ChainCode } from '../types'

function validAddress(chain: ChainCode, addr: string): boolean {
  if (chain === 'TRON') return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(addr)
  return /^0x[0-9a-fA-F]{40}$/.test(addr)
}

export default function Withdraw() {
  const st = useStore()
  const nav = useNav()
  const [chainCode, setChainCode] = useState<ChainCode>('ETHEREUM')
  const [to, setTo] = useState('')
  const [amount, setAmount] = useState('')
  const [done, setDone] = useState<{ id: string } | null>(null)

  const chain = CHAINS.find((c) => c.code === chainCode)!
  const num = parseFloat(amount) || 0
  const total = num + chain.withdrawFeeFlat

  const todayUsed = useMemo(() => {
    const dayStart = new Date().setHours(0, 0, 0, 0)
    return st.withdrawals
      .filter((w) => w.createdAt >= dayStart && w.status !== 'CANCELED' && w.status !== 'FAILED')
      .reduce(
        (acc, w) => ({ amount: acc.amount + w.amount, count: acc.count + 1 }),
        { amount: 0, count: 0 },
      )
  }, [st.withdrawals])

  const addrOk = validAddress(chainCode, to.trim())
  const overBalance = total > st.balance
  const overDaily =
    todayUsed.amount + num > LIMITS.withdrawDailyAmount ||
    todayUsed.count + 1 > LIMITS.withdrawDailyCount
  const canSubmit = num > 0 && addrOk && !overBalance && !overDaily

  const maxAvail = Math.max(0, Math.min(st.balance - chain.withdrawFeeFlat, LIMITS.withdrawDailyAmount - todayUsed.amount))

  const submit = () => {
    const wd = st.createWithdraw(chainCode, to.trim(), num)
    haptic('success')
    setDone({ id: wd.id })
  }

  const wd = done ? st.withdrawals.find((w) => w.id === done.id) : null

  return (
    <div className="screen">
      <BackHeader title="Вивід коштів" />
      <p className="screen-sub">
        Вивід UAHe на власну адресу. Ліміт: {fmt(LIMITS.withdrawDailyAmount)} {TICKER} або{' '}
        {LIMITS.withdrawDailyCount} заявок на добу.
      </p>

      <div className="section-label">Мережа</div>
      <div className="network-list">
        {CHAINS.filter((c) => c.tokens.includes('UAHe')).map((c) => (
          <button
            key={c.code}
            className={`network-option ${c.code === chainCode ? 'selected' : ''}`}
            onClick={() => {
              haptic('select')
              setChainCode(c.code)
            }}
          >
            <div className="net-logo" style={{ background: c.color }}>
              {c.short[0]}
            </div>
            <div className="row-body">
              <div className="row-title">{c.title}</div>
              <div className="row-sub">
                {c.standard} · комісія {fmt(c.withdrawFeeFlat)} {TICKER}
              </div>
            </div>
            <div className="radio-dot" />
          </button>
        ))}
      </div>

      <div className="section-label">Адреса отримувача</div>
      <div className="field">
        <input
          className={`input mono ${to && !addrOk ? 'input-error' : ''}`}
          placeholder={chainCode === 'TRON' ? 'T…' : '0x…'}
          value={to}
          onChange={(e) => setTo(e.target.value)}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
        />
        {to && !addrOk && (
          <div className="field-hint error">Невірний формат адреси для мережі {chain.title}</div>
        )}
      </div>

      <div className="section-label">Сума</div>
      <div className="card">
        <div className="field" style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              className="input"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                const v = e.target.value.replace(',', '.').replace(/[^\d.]/g, '')
                if ((v.match(/\./g) ?? []).length > 1) return
                setAmount(v)
              }}
            />
            <button
              className="btn btn-ghost"
              style={{ width: 'auto', padding: '0 18px' }}
              onClick={() => setAmount(String(Math.floor(maxAvail * 100) / 100))}
            >
              MAX
            </button>
          </div>
        </div>
        <KV k="Комісія мережі" v={`${fmt(chain.withdrawFeeFlat)} ${TICKER}`} />
        <KV k="Разом до списання" v={<b>{fmt(total)} {TICKER}</b>} />
        <KV
          k="Ліміт на сьогодні"
          v={`${fmt(LIMITS.withdrawDailyAmount - todayUsed.amount)} ${TICKER} · ${
            LIMITS.withdrawDailyCount - todayUsed.count
          } заявок`}
        />
        {overBalance && num > 0 && (
          <div className="field-hint error">Недостатньо коштів: доступно {fmt(st.balance)} {TICKER}</div>
        )}
        {overDaily && num > 0 && !overBalance && (
          <div className="field-hint error">Перевищено добовий ліміт виводу</div>
        )}
      </div>

      <div className="spacer" />
      <button className="btn btn-primary" disabled={!canSubmit} onClick={submit}>
        ⬆️ Вивести {num > 0 ? `${fmt(num)} ${TICKER}` : ''}
      </button>

      {wd && (
        <Sheet onClose={() => (setDone(null), nav.pop())}>
          <div className="success-pop">✅</div>
          <h3 className="center">Заявку на вивід створено</h3>
          <div className="card" style={{ marginTop: 4 }}>
            <KV k="Статус" v={<StatusBadge status={wd.status} />} />
            <KV k="Мережа" v={chain.title} />
            <KV k="Сума" v={`${fmt(wd.amount)} ${TICKER}`} />
            <KV k="Комісія" v={`${fmt(wd.fee)} ${TICKER}`} />
            {wd.txHash && <KV k="Tx" v={<span className="mono">{wd.txHash.slice(0, 18)}…</span>} />}
          </div>
          <div className="field-hint center" style={{ margin: '12px 0' }}>
            Статус оновлюється автоматично — слідкуйте у розділі «Історія».
          </div>
          <button className="btn btn-primary" onClick={() => (setDone(null), nav.pop())}>
            Готово
          </button>
        </Sheet>
      )}
    </div>
  )
}
