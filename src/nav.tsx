/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { haptic, supports61, tg } from './telegram'
import { Icon } from './ds'
import { GradTitle } from './components'

export type Tab = 'home' | 'market' | 'history' | 'profile'

export type Route =
  | { name: 'deposit' }
  | { name: 'withdraw' }
  | { name: 'checks' }
  | { name: 'check-create' }
  | { name: 'check-detail'; token: string }
  | { name: 'mobile' }
  | { name: 'iban' }
  | { name: 'bill' }
  | { name: 'others'; code: string }
  | { name: 'brand'; code: string }
  | { name: 'cert'; id: string }
  | { name: 'my-certs' }
  | { name: 'referral' }

interface Nav {
  tab: Tab
  setTab: (t: Tab) => void
  stack: Route[]
  push: (r: Route) => void
  pop: () => void
  popAll: () => void
  replace: (r: Route) => void
}

const NavCtx = createContext<Nav | null>(null)

export function NavProvider({ children }: { children: ReactNode }) {
  const [tab, setTabRaw] = useState<Tab>('home')
  const [stack, setStack] = useState<Route[]>([])

  const nav = useMemo<Nav>(
    () => ({
      tab,
      stack,
      setTab: (t) => {
        haptic('select')
        setTabRaw(t)
        setStack([])
        window.scrollTo(0, 0)
      },
      push: (r) => {
        haptic('tap')
        setStack((s) => [...s, r])
        window.scrollTo(0, 0)
      },
      pop: () => {
        setStack((s) => s.slice(0, -1))
      },
      popAll: () => setStack([]),
      replace: (r) => setStack((s) => [...s.slice(0, -1), r]),
    }),
    [tab, stack],
  )

  // Telegram native back button drives the stack
  useEffect(() => {
    const bb = tg?.BackButton
    if (!bb || !supports61()) return
    const onBack = () => nav.pop()
    if (stack.length > 0) {
      bb.show()
      bb.onClick(onBack)
      return () => bb.offClick(onBack)
    }
    bb.hide()
  }, [stack.length, nav])

  return <NavCtx.Provider value={nav}>{children}</NavCtx.Provider>
}

export function useNav() {
  const ctx = useContext(NavCtx)
  if (!ctx) throw new Error('useNav outside provider')
  return ctx
}

export function BackHeader({ title, gradientWord }: { title: string; gradientWord?: string }) {
  const nav = useNav()
  return (
    <div className="subheader">
      <button className="icon-btn" onClick={nav.pop} aria-label="Назад">
        <Icon name="arrow_back" size={22} />
      </button>
      <h2>
        <GradTitle title={title} word={gradientWord} />
      </h2>
    </div>
  )
}
