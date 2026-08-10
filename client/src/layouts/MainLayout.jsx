import { Outlet, useLocation } from 'react-router-dom'

import BottomNav from '../components/layout/BottomNav.jsx'
import Footer from '../components/layout/Footer.jsx'
import Header from '../components/layout/Header.jsx'

export default function MainLayout() {
  const location = useLocation()
  // Every mobile screen in the approved design draws its own header, so the
  // marketing shell is desktop-only there. The home screen is the exception:
  // its phone layout is already approved with this header on top.
  const isHome = location.pathname === '/'

  return (
    <div className="flex min-h-screen min-h-svh flex-col">
      <Header className={isHome ? '' : 'hidden lg:block'} />
      {/* The trailing space clears the fixed bottom bar, which only exists below `lg`. */}
      <main className="flex-1 pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0">
        <Outlet />
      </main>
      {/* The long marketing footer is desktop-only; the bottom bar replaces it. */}
      <div className="hidden lg:block">
        <Footer />
      </div>
      <BottomNav />
    </div>
  )
}
