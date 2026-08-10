import { Building2, House, Plus, Search, UserRound } from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router-dom'

import { useLocale } from '../../hooks/useLocale.js'

/**
 * Fixed application navigation for phones and portrait tablets.
 *
 * Every destination already exists in the router; the bar only re-exposes them
 * at thumb height. It is hidden from `lg` upwards so the desktop header stays
 * the single navigation surface there.
 */
export default function BottomNav() {
  const { t } = useLocale()
  const location = useLocation()
  const currentPath = `${location.pathname}${location.search}`

  const tabs = [
    { end: true, icon: House, labelKey: 'navigation.home', to: '/' },
    { icon: Building2, labelKey: 'navigation.offices', to: '/offices' },
    { icon: Search, labelKey: 'navigation.search', to: '/properties' },
    // The account hub is the approved phone destination for this tab; it routes
    // on to the dashboard, favorites, or login from there.
    { icon: UserRound, labelKey: 'navigation.account', to: '/account' },
  ]

  function tabClassName({ isActive }) {
    return `flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 outline-none transition-colors duration-fast ease-standard focus-visible:ring-3 focus-visible:ring-home-gold/50 motion-reduce:transition-none ${
      isActive ? 'text-home-gold' : 'text-home-band-text/70'
    }`
  }

  function renderTab(tab) {
    const Icon = tab.icon

    return (
      <li className="flex min-w-0 flex-1 justify-center" key={tab.to}>
        <NavLink
          className={tabClassName}
          end={tab.end}
          state={tab.to === '/login' ? { from: currentPath } : undefined}
          to={tab.to}
        >
          {({ isActive }) => (
            <>
              <Icon aria-hidden="true" size={22} strokeWidth={isActive ? 2.4 : 1.8} />
              <span className="w-full truncate text-center text-[11px] font-semibold leading-tight">
                {t(tab.labelKey)}
              </span>
            </>
          )}
        </NavLink>
      </li>
    )
  }

  return (
    <nav
      aria-label={t('accessibility.bottomNavigation')}
      className="fixed inset-x-0 bottom-0 z-header border-t border-home-band-text/12 bg-home-band pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_24px_rgba(18,36,59,0.22)] lg:hidden"
    >
      <ul className="mx-auto flex h-[72px] max-w-[520px] items-center justify-around px-1">
        {tabs.slice(0, 2).map(renderTab)}

        <li className="flex min-w-0 flex-1 flex-col items-center justify-center">
          <Link
            aria-label={t('navigation.add')}
            className="-mt-8 inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-home-gold text-home-on-gold shadow-[0_8px_20px_rgba(208,166,74,0.45)] outline-none ring-4 ring-home-band transition-transform duration-fast ease-standard focus-visible:ring-home-gold/60 active:scale-95 motion-reduce:transition-none"
            to="/dashboard/properties/new"
          >
            <Plus aria-hidden="true" size={26} strokeWidth={2.4} />
          </Link>
          <span className="mt-1 w-full truncate text-center text-[11px] font-semibold leading-tight text-home-band-text/70">
            {t('navigation.add')}
          </span>
        </li>

        {tabs.slice(2).map(renderTab)}
      </ul>
    </nav>
  )
}
