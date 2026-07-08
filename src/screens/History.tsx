import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { CHAINS, TICKER, fmt, fmtDate } from '../data'
import { EmptyState, KV, Sheet, StatusBadge } from '../components'
import { haptic } from '../telegram'
import { ReceiptRow, Segmented } from '../ds'
import type { TileColor } from '../ds'
import type { Operation, ServiceRequest } from '../types'

const KIND_META: Record<string, { icon: string; tile: TileColor }> = {
  DEPOSIT: { icon: 'south', tile: 'lime' },
  WITHDRAWAL: { icon: 'north', tile: 'sky' },
  TRANSFER: { icon: 'swap_horiz', tile: 'violet' },
  HOLD: { icon: 'lock', tile: 'yellow' },
  CAPTURE: { icon: 'check', tile: 'lime' },
  RELEASE: { icon: 'lock_open', tile: 'lime' },
}

function dayLabel(ts: number): string {
  const d = new Date(ts)
  const today = new Date()
  const yesterday = new Date(today.getTime() - 86400_000)
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  if (sameDay(d, today)) return 'сьогодні'
  if (sameDay(d, yesterday)) return 'учора'
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })
}

export default function History() {
  const st = useStore()
  const [seg, setSeg] = useState('ops')
  const [openReq, setOpenReq] = useState<ServiceRequest | null>(null)

  const opsByDay = useMemo(() => {
    const groups: { day: string; rows: Operation[] }[] = []
    for (const op of st.ops) {
      const day = dayLabel(op.createdAt)
      const last = groups[groups.length - 1]
      if (last && last.day === day) last.rows.push(op)
      else groups.push({ day, rows: [op] })
    }
    return groups
  }, [st.ops])

  return (
    <div className="screen">
      <div className="screen-title">Історія</div>
      <p className="screen-sub">операції _ заявки _ виводи</p>

      <Segmented
        options={[
          { key: 'ops', label: 'Операції' },
          { key: 'reqs', label: 'Заявки' },
          { key: 'wd', label: 'Виводи' },
        ]}
        value={seg}
        onChange={setSeg}
      />

      {seg === 'ops' && (
        <>
          {st.ops.length === 0 && <EmptyState title="Операцій ще немає" />}
          {opsByDay.map((g) => (
            <div key={g.day + g.rows[0]?.id}>
              <div className="day-header">{g.day}</div>
              {g.rows.map((op) => {
                const meta = KIND_META[op.kind] ?? KIND_META.TRANSFER
                return (
                  <ReceiptRow
                    key={op.id}
                    icon={meta.icon}
                    tileColor={meta.tile}
                    label={op.title}
                    subline={fmtDate(op.createdAt)}
                    amount={op.amount === 0 ? undefined : fmt(op.amount)}
                    positive={op.amount > 0}
                  />
                )
              })}
            </div>
          ))}
        </>
      )}

      {seg === 'reqs' && (
        <>
          {st.requests.length === 0 && (
            <EmptyState title="Заявок ще немає" sub="Створіть заявку на головному екрані" />
          )}
          {st.requests.map((r) => (
            <ReceiptRow
              key={r.id}
              icon="mark_email_unread"
              tileColor="orange"
              label={`№${r.id} · ${r.title}`}
              subline={fmtDate(r.createdAt)}
              amount={`${fmt(r.amountUah)} грн`}
              badge={<StatusBadge status={r.status} />}
              onClick={() => setOpenReq(r)}
            />
          ))}
        </>
      )}

      {seg === 'wd' && (
        <>
          {st.withdrawals.length === 0 && (
            <EmptyState title="Виводів ще немає" sub="Вивід доступний з головного екрана" />
          )}
          {st.withdrawals.map((w) => (
            <ReceiptRow
              key={w.id}
              icon="north"
              tileColor="sky"
              label={`${CHAINS.find((c) => c.code === w.chain)?.title ?? w.chain} · ${w.to.slice(0, 6)}…${w.to.slice(-4)}`}
              subline={`${fmtDate(w.createdAt)}${w.txHash ? ` · ${w.txHash.slice(0, 10)}…` : ''}`}
              amount={`−${fmt(w.amount + w.fee)}`}
              badge={<StatusBadge status={w.status} />}
            />
          ))}
        </>
      )}

      {openReq && (
        <Sheet title={`Заявка №${openReq.id}`} onClose={() => setOpenReq(null)}>
          <div className="panel">
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
                Скасувати заявку
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
