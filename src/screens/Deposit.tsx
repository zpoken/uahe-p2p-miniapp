import { useState } from 'react'
import { BackHeader } from '../nav'
import { CHAINS, DEPOSIT_RATES } from '../data'
import { useStore } from '../store'
import { CopyBox, KV, SectionTitle, Sheet, useToast } from '../components'
import { haptic } from '../telegram'
import { Icon, NetworkCard } from '../ds'
import type { ChainCode } from '../types'

const NET_MARK: Record<ChainCode, string> = { ETHEREUM: 'Ξ', BASE: 'B', TRON: 'T' }

export default function Deposit() {
  const st = useStore()
  const toast = useToast()
  const [chainCode, setChainCode] = useState<ChainCode>('ETHEREUM')
  const [qr, setQr] = useState(false)
  const chain = CHAINS.find((c) => c.code === chainCode)!

  return (
    <div className="screen">
      <BackHeader title="Поповнення балансу" gradientWord="Поповнення" />

      <div className="network-list">
        {CHAINS.map((c) => (
          <NetworkCard
            key={c.code}
            mark={NET_MARK[c.code]}
            name={c.title}
            sub={`${c.standard} · ${c.tokens.join(', ')}`}
            selected={c.code === chainCode}
            onClick={() => {
              haptic('select')
              setChainCode(c.code)
            }}
          />
        ))}
      </div>

      <div style={{ marginTop: 18, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <CopyBox
            label="Адреса для поповнення"
            value={chain.depositAddress}
            note="Адресу скопійовано"
          />
        </div>
        <button
          className="icon-btn"
          style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--page)', border: '1px solid var(--hairline)' }}
          onClick={() => setQr(true)}
          aria-label="QR-код"
        >
          <Icon name="qr_code_2" size={24} />
        </button>
      </div>

      <SectionTitle>Курси зарахування</SectionTitle>
      <div className="panel">
        {chain.tokens.map((t) => (
          <KV key={t} k={t} v={DEPOSIT_RATES[t]} />
        ))}
        <div className="field-hint" style={{ marginTop: 10 }}>
          Курс фіксується в момент зарахування депозиту в мережі {chain.title}.
        </div>
      </div>

      <div className="spacer" />
      <button
        className="btn btn-ghost"
        onClick={() => {
          st.simulateDeposit(chain.code, chain.tokens[0], 1000)
          haptic('success')
          toast('Демо-депозит зараховано')
        }}
      >
        Демо: імітувати депозит 1 000 {chain.tokens[0]}
      </button>
      <div className="footnote">
        У демо-режимі депозит зараховується миттєво. У бойовому режимі адресу видає custody-провайдер.
      </div>

      {qr && (
        <Sheet title="Адреса поповнення" onClose={() => setQr(false)}>
          <div className="center">
            <div
              style={{
                width: 200,
                height: 200,
                margin: '0 auto 16px',
                borderRadius: 16,
                background: '#fff',
                border: '1px solid var(--hairline)',
                display: 'grid',
                gridTemplateColumns: 'repeat(11, 1fr)',
                padding: 14,
                gap: 2,
              }}
            >
              {Array.from({ length: 121 }).map((_, i) => {
                const on = (i * 73 + 17) % 5 < 2 || i < 11 || i % 11 === 0
                return <span key={i} style={{ background: on ? '#000' : 'transparent', borderRadius: 1 }} />
              })}
            </div>
            <CopyBox value={chain.depositAddress} note="Адресу скопійовано" />
          </div>
        </Sheet>
      )}
    </div>
  )
}
