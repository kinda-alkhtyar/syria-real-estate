import { Building2, LayoutDashboard, Plus, ShieldCheck } from 'lucide-react'
import { useMemo } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

import LanguageSelector from '../components/common/LanguageSelector.jsx'
import Logo from '../components/common/Logo.jsx'
import ThemeSwitcher from '../components/common/ThemeSwitcher.jsx'
import BottomNav from '../components/layout/BottomNav.jsx'
import Container from '../components/ui/Container.jsx'
import UserMenu from '../features/auth/components/UserMenu.jsx'
import { useAuth } from '../features/auth/hooks/useAuth.js'
import { usePendingReviewCount } from '../features/management/hooks/usePendingReviewCount.js'
import { useLocale } from '../hooks/useLocale.js'

const navigation = [
  {
    end: true,
    icon: LayoutDashboard,
    labelKey: 'dashboard.navigation.overview',
    to: '/dashboard',
  },
  {
    icon: Plus,
    labelKey: 'dashboard.navigation.create',
    to: '/dashboard/properties/new',
  },
  {
    icon: Building2,
    labelKey: 'dashboard.navigation.browse',
    to: '/properties',
  },
]

// Moderation is administrator work, so the entry is added to the shared list
// rather than living in it: an owner never sees the item or its request.
const reviewNavigationItem = {
  icon: ShieldCheck,
  labelKey: 'dashboard.navigation.review',
  to: '/dashboard/review',
}

export default function DashboardLayout() {
  const { t } = useLocale()
  const { user } = useAuth()
  const isAdministrator = user?.role === 'ADMIN'
  const { count: pendingReviewCount, refresh: refreshPendingCount } =
    usePendingReviewCount({ enabled: isAdministrator })
  const items = isAdministrator
    ? [navigation[0], reviewNavigationItem, ...navigation.slice(1)]
    : navigation
  const outletContext = useMemo(
    () => ({ refreshPendingCount }),
    [refreshPendingCount],
  )

  return (
    <div className="flex min-h-screen min-h-svh flex-col bg-canvas">
      {/* Desktop-only shell: phones open straight into the approved mobile
          screen, which draws its own header and owns language switching. */}
      <header className="sticky top-0 z-header hidden border-b border-line bg-header lg:block">
        <Container>
          <div className="flex min-h-18 flex-wrap items-center justify-between gap-3 py-2">
            <Logo />
            <div className="flex items-center gap-1">
              <LanguageSelector className="hidden sm:inline-flex" />
              <ThemeSwitcher className="hidden sm:inline-flex" />
              <UserMenu />
            </div>
          </div>
        </Container>
      </header>

      {/* The trailing space clears the fixed bottom bar, which only exists below `lg`. */}
      <Container className="flex-1 pb-[calc(4.5rem+env(safe-area-inset-bottom))] max-lg:px-0! lg:pb-0 lg:py-8">
        <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-8">
          <aside className="hidden lg:block">
            <nav
              aria-label={t('dashboard.navigation.label')}
              className="rounded-2xl border border-line bg-surface p-2"
            >
              <ul className="flex gap-1 overflow-x-auto lg:grid">
                {items.map(({ end, icon: Icon, labelKey, to }) => (
                  <li className="shrink-0" key={to}>
                    <NavLink
                      className={({ isActive }) =>
                        `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-focus/35 ${
                          isActive
                            ? 'bg-action text-on-action'
                            : 'text-muted hover:bg-hover hover:text-ink'
                        }`
                      }
                      end={end}
                      to={to}
                    >
                      <Icon aria-hidden="true" size={18} />
                      {t(labelKey)}
                      {to === reviewNavigationItem.to &&
                        pendingReviewCount > 0 && (
                          <span
                            aria-label={t(
                              'dashboard.navigation.reviewBadgeLabel',
                              { count: pendingReviewCount },
                            )}
                            className="ms-auto inline-flex min-w-6 items-center justify-center rounded-full bg-warning/15 px-1.5 py-0.5 text-xs font-bold text-warning"
                          >
                            {pendingReviewCount}
                          </span>
                        )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          <main className="min-w-0" id="dashboard-content">
            <Outlet context={outletContext} />
          </main>
        </div>
      </Container>

      {/* Phones keep the same application bar as the rest of the app, so the
          dashboard is never a dead end without navigation. */}
      <BottomNav />
    </div>
  )
}
