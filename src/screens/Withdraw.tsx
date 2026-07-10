import { useMemo, useState } from 'react'
import { BackHeader, useNav } from '../nav'
import { CHAINS, LIMITS, TICKER, fmt } from '../data'
import { useStore } from '../store'
import { KV, Sheet } from '../components'
import { haptic, showError } from '../telegram'
import { NetworkCard, StatusTimeline } from '../ds'
import type { ChainCode, WithdrawStatus } from '../types'

const NET_MARK: Record<string, string> = { ETHEREUM: 'Ξ', BASE: 'B', TRON: 'T' }

function validAddress(chain: ChainCode, addr: string): boolean {
  if (chain === 'TRON') return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(addr)
  return /^0x[0-9a-fA-F]{40}$/.test(addr)
}

function timelineStep(status: WithdrawStatus): number {
  if (status === 'MINED') return 2
  if (status === 'BROADCASTED') return 1
  return 0
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

  const maxAvail = Math.max(
    0,
    Math.min(st.balance - chain.withdrawFeeFlat, LIMITS.withdrawDailyAmount - todayUsed.amount),
  )

  const wd = done ? st.withdrawals.find((w) => w.id === done.id) : null

  return (
    <div className="screen">
      <BackHeader title="Вивід коштів" gradientWord="Вивід" />

      {/* only chains that carry UAHe support withdrawal */}
      <div className="network-list">
        {CHAINS.filter((c) => c.tokens.includes('UAHe')).map((c) => (
          <NetworkCard
            key={c.code}
            mark={NET_MARK[c.code]}
            name={c.title}
            sub={`комісія ${fmt(c.withdrawFeeFlat)} UAHe`}
            selected={c.code === chainCode}
            onClick={() => {
              haptic('select')
              setChainCode(c.code)
            }}
          />
        ))}
      </div>

      <div className="field" style={{ marginTop: 16 }}>
        <label className="field-label">Адреса гаманця</label>
        <input
          className={`input mono ${to && !addrOk ? 'input-error' : ''}`}
          placeholder="0x…"
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

      <div className="panel">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            className="input mono"
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
            className="chip"
            style={{ padding: '13px 16px' }}
            onClick={() => setAmount(String(Math.floor(maxAvail * 100) / 100))}
          >
            MAX
          </button>
        </div>
        <div className="divider" />
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
      <button
        className="btn btn-primary"
        disabled={!canSubmit}
        onClick={async () => {
          try {
            const w = await st.createWithdraw(chainCode, to.trim(), num)
            haptic('success')
            setDone({ id: w.id })
          } catch (e) {
            haptic('error')
            showError(e instanceof Error ? e.message : String(e))
          }
        }}
      >
        Вивести {num > 0 ? `${fmt(num)} ${TICKER}` : ''}
      </button>

      {wd && (
        <Sheet onClose={() => (setDone(null), nav.pop())}>
          <div className="success-pop">
            <span className="material-symbols-rounded" style={{ fontSize: 40 }}>
              check
            </span>
          </div>
          <h3 className="center">Заявку на вивід створено</h3>
          <div className="center mono" style={{ fontSize: 14, color: 'var(--ink-60)', marginBottom: 20 }}>
            {fmt(wd.amount)} {TICKER} · {chain.title} · комісія {fmt(wd.fee)} {TICKER}
          </div>
          <StatusTimeline steps={['Створено', 'В мережі', 'Виконано']} active={timelineStep(wd.status)} />
          <div className="footnote" style={{ margin: '16px 0 18px' }}>
            Статус оновлюється автоматично — слідкуйте в розділі «Історія».
          </div>
          <button className="btn btn-primary" onClick={() => (setDone(null), nav.pop())}>
            Зрозуміло
          </button>
        </Sheet>
      )}
    </div>
  )
}
