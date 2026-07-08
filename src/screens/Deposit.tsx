import { useState } from 'react'
import { BackHeader } from '../nav'
import { CHAINS, DEPOSIT_RATES } from '../data'
import { useStore } from '../store'
import { useCopy, useToast } from '../components'
import { haptic } from '../telegram'
import type { ChainCode } from '../types'

export default function Deposit() {
  const st = useStore()
  const copy = useCopy()
  const toast = useToast()
  const [chainCode, setChainCode] = useState<ChainCode>('ETHEREUM')
  const chain = CHAINS.find((c) => c.code === chainCode)!

  return (
    <div className="screen">
      <BackHeader title="Поповнення балансу" />
      <p className="screen-sub">
        Надішліть токени на вашу персональну адресу — баланс зарахується автоматично. USDT та USDC
        конвертуються в UAHe за ринковим курсом.
      </p>

      <div className="section-label">Мережа</div>
      <div className="network-list">
        {CHAINS.map((c) => (
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
                {c.standard} · {c.tokens.join(', ')}
              </div>
            </div>
            <div className="radio-dot" />
          </button>
        ))}
      </div>

      <div className="section-label">Ваша адреса для поповнення</div>
      <div className="copy-box">
        <span className="addr">{chain.depositAddress}</span>
        <button
          className="icon-btn"
          onClick={() => copy(chain.depositAddress, 'Адресу скопійовано')}
          aria-label="Копіювати адресу"
        >
          📋
        </button>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="row-title" style={{ marginBottom: 6 }}>
          Курси зарахування
        </div>
        {chain.tokens.map((t) => (
          <div key={t} className="kv">
            <span className="k">• {t}</span>
            <span className="v">{DEPOSIT_RATES[t]}</span>
          </div>
        ))}
        <div className="field-hint" style={{ marginTop: 8 }}>
          Курс фіксується в момент зарахування депозиту в мережі {chain.title}.
        </div>
      </div>

      <div className="spacer" />
      <button
        className="btn btn-ghost"
        onClick={() => {
          st.simulateDeposit(chain.code, chain.tokens[0], 1000)
          haptic('success')
          toast('Демо-депозит зараховано ✅')
        }}
      >
        🎮 Демо: імітувати депозит 1 000 {chain.tokens[0]}
      </button>
      <div className="footnote">
        У демо-режимі депозит зараховується миттєво. У бойовому режимі адреса видається custody-провайдером.
      </div>
    </div>
  )
}
