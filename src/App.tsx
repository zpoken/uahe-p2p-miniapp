import { useEffect } from 'react'
import { NavProvider, useNav } from './nav'
import type { Route, Tab } from './nav'
import { StoreProvider } from './store'
import { ToastProvider } from './components'
import { initTelegram } from './telegram'

import Home from './screens/Home'
import Deposit from './screens/Deposit'
import Withdraw from './screens/Withdraw'
import { CheckCreate, CheckDetail, ChecksList } from './screens/Checks'
import { BillScan, IbanTransfer, MobileTopup, OtherService } from './screens/Services'
import { BrandScreen, CertView, Market, MyCerts } from './screens/Market'
import History from './screens/History'
import { Profile, Referral } from './screens/Profile'

function RouteScreen({ route }: { route: Route }) {
  switch (route.name) {
    case 'deposit':
      return <Deposit />
    case 'withdraw':
      return <Withdraw />
    case 'checks':
      return <ChecksList />
    case 'check-create':
      return <CheckCreate />
    case 'check-detail':
      return <CheckDetail token={route.token} />
    case 'mobile':
      return <MobileTopup />
    case 'iban':
      return <IbanTransfer />
    case 'bill':
      return <BillScan />
    case 'others':
      return <OtherService code={route.code} />
    case 'brand':
      return <BrandScreen code={route.code} />
    case 'cert':
      return <CertView id={route.id} />
    case 'my-certs':
      return <MyCerts />
    case 'referral':
      return <Referral />
  }
}

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'home', icon: '🏠', label: 'Головна' },
  { id: 'market', icon: '🛍', label: 'Маркет' },
  { id: 'history', icon: '📊', label: 'Історія' },
  { id: 'profile', icon: '👤', label: 'Профіль' },
]

function Shell() {
  const nav = useNav()
  const top = nav.stack[nav.stack.length - 1]

  return (
    <>
      {top ? (
        <RouteScreen key={nav.stack.length} route={top} />
      ) : (
        <>
          {nav.tab === 'home' && <Home />}
          {nav.tab === 'market' && <Market />}
          {nav.tab === 'history' && <History />}
          {nav.tab === 'profile' && <Profile />}
        </>
      )}
      <nav className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab ${nav.tab === t.id && !top ? 'active' : ''}`}
            onClick={() => nav.setTab(t.id)}
          >
            <span className="tab-icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </>
  )
}

export default function App() {
  useEffect(() => {
    initTelegram('#0b1220')
  }, [])

  return (
    <StoreProvider>
      <ToastProvider>
        <NavProvider>
          <Shell />
        </NavProvider>
      </ToastProvider>
    </StoreProvider>
  )
}
