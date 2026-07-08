import { useState } from 'react'
import { useStore } from '../store'
import { CHAINS, TICKER, fmt, fmtDate } from '../data'
import { EmptyState, KV, Sheet, StatusBadge } from '../components'
import { haptic } from '../telegram'
import type { ServiceRequest } from '../types'

const KIND_ICON: Record<string, string> = {
  DEPOSIT: '⬇️',
  WITHDRAWAL: '⬆️',
  TRANSFER: '💸',
  HOLD: '🔒',
  CAPTURE: '✅',
  RELEASE: '🔓',
}

export default function History() {
  const st = useStore()
  const [seg, setSeg] = useState<'ops' | 'reqs' | 'wd'>('ops')
  const [openReq, setOpenReq] = useState<ServiceRequest | null>(null)

  return (
    <div className="screen">
      <div className="screen-title">📊 Історія</div>
      <p className="screen-sub">Операції за балансом, заявки та виводи коштів.</p>

      <div className="segmented">
        <button className={seg === 'ops' ? 'active' : ''} onClick={() => (haptic('select'), setSeg('ops'))}>
          Операції
        </button>
        <button className={seg === 'reqs' ? 'active' : ''} onClick={() => (haptic('select'), setSeg('reqs'))}>
          Заявки
        </button>
        <button className={seg === 'wd' ? 'active' : ''} onClick={() => (haptic('select'), setSeg('wd'))}>
          Виводи
        </button>
      </div>

      {seg === 'ops' && (
        <>
          {st.ops.length === 0 && <EmptyState emoji="🧮" title="Операцій ще немає" />}
          {st.ops.map((op) => (
            <div key={op.id} className="row">
              <div className={`row-icon ${op.amount >= 0 ? 'tint-green' : 'tint-blue'}`}>
                {KIND_ICON[op.kind] ?? '•'}
              </div>
              <div className="row-body">
                <div className="row-title">{op.title}</div>
                <div className="row-sub">{fmtDate(op.createdAt)}</div>
              </div>
              {op.amount !== 0 && (
                <div className="row-end">
                  <div className={`row-amount ${op.amount >= 0 ? 'pos' : 'neg'}`}>
                    {op.amount >= 0 ? '+' : ''}
                    {fmt(op.amount)}
                  </div>
                  <div className="row-caption">{TICKER}</div>
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {seg === 'reqs' && (
        <>
          {st.requests.length === 0 && (
            <EmptyState emoji="📨" title="Заявок ще немає" sub="Створіть заявку на головному екрані" />
          )}
          {st.requests.map((r) => (
            <button key={r.id} className="row" onClick={() => setOpenReq(r)}>
              <div className="row-icon tint-gold">📨</div>
              <div className="row-body">
                <div className="row-title">
                  #{r.id} · {r.title}
                </div>
                <div className="row-sub">{fmtDate(r.createdAt)}</div>
              </div>
              <div className="row-end">
                <div className="row-amount neg">{fmt(r.amountUah)} грн</div>
                <div className="row-caption">
                  <StatusBadge status={r.status} />
                </div>
              </div>
            </button>
          ))}
        </>
      )}

      {seg === 'wd' && (
        <>
          {st.withdrawals.length === 0 && (
            <EmptyState emoji="⛓" title="Виводів ще немає" sub="Вивід доступний з головного екрана" />
          )}
          {st.withdrawals.map((w) => (
            <div key={w.id} className="row">
              <div className="row-icon tint-blue">⬆️</div>
              <div className="row-body">
                <div className="row-title">
                  {CHAINS.find((c) => c.code === w.chain)?.title ?? w.chain} ·{' '}
                  <span className="mono">{w.to.slice(0, 8)}…</span>
                </div>
                <div className="row-sub">
                  {fmtDate(w.createdAt)}
                  {w.txHash ? ` · tx ${w.txHash.slice(0, 10)}…` : ''}
                </div>
              </div>
              <div className="row-end">
                <div className="row-amount neg">−{fmt(w.amount + w.fee)}</div>
                <div className="row-caption">
                  <StatusBadge status={w.status} />
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {openReq && (
        <Sheet title={`Заявка №${openReq.id}`} onClose={() => setOpenReq(null)}>
          <div className="card">
            <KV k="Послуга" v={openReq.title} />
            {Object.entries(openReq.details).map(([k, v]) => (
              <KV key={k} k={k} v={v} />
            ))}
            <KV k="Сума" v={`${fmt(openReq.amountUah)} грн`} />
            {openReq.feeUahe ? <KV k="Комісія" v={`${fmt(openReq.feeUahe)} ${TICKER}`} /> : null}
            <KV k="Створено" v={fmtDate(openReq.createdAt)} />
            <KV k="Статус" v={<StatusBadge status={openReq.status} />} />
            {openReq.declineReason && <KV k="Причина відмови" v={openReq.declineReason} />}
          </div>
          {openReq.status === 'PENDING' && (
            <>
              <div className="spacer" />
              <button
                className="btn btn-danger"
                onClick={() => {
                  st.cancelRequest(openReq.id)
                  haptic('error')
                  setOpenReq(null)
                }}
              >
                ❌ Скасувати заявку
              </button>
            </>
          )}
          <div className="spacer" />
          <button className="btn btn-ghost" onClick={() => setOpenReq(null)}>
            Закрити
          </button>
        </Sheet>
      )}
    </div>
  )
}
