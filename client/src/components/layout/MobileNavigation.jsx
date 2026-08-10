import { Heart } from 'lucide-react'
import { Link } from 'react-router-dom'

import Button from '../ui/Button.jsx'
import { useLocale } from '../../hooks/useLocale.js'
import { useFavorites } from '../../hooks/useFavorites.js'
import UserMenu from '../../features/auth/components/UserMenu.jsx'
import { useAuth } from '../../features/auth/hooks/useAuth.js'

export default function MobileNavigation({
  id,
  isOpen,
  items,
  onNavigate,
  returnTo,
}) {
  const { count: favoriteCount } = useFavorites()
  const { isAuthenticated, status } = useAuth()
  const { t } = useLocale()

  if (!isOpen) {
    return null
  }

  return (
    <div
      className="absolute inset-x-0 top-full max-h-[calc(100svh-4rem)] overflow-y-auto border-b border-t border-line bg-[color:var(--surface-elevated)] px-4 py-4 shadow-md sm:px-6 lg:px-8 desktop:hidden"
      id={id}
    >
      <nav aria-label={t('accessibility.mobileNavigation')}>
        <ul className="grid gap-1">
          {items.map((item) => (
            <li
              className={item.compactHidden ? 'hidden lg:block' : undefined}
              key={item.href}
            >
              <a
                className="flex min-h-11 items-center rounded-xl px-3 py-2 text-base font-semibold text-ink hover:bg-hover"
                href={item.href}
                onClick={onNavigate}
              >
                {t(item.labelKey)}
              </a>
            </li>
          ))}
          <li>
            <Link
              className="favorite-button flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-base font-semibold text-ink hover:bg-hover"
              data-favorite={favoriteCount > 0}
              onClick={onNavigate}
              to="/favorites"
            >
              <Heart
                aria-hidden="true"
                data-favorite-icon
                size={19}
              />
              <span>{t('favorites.title')}</span>
              {favoriteCount > 0 && (
                <span
                  aria-label={t('favorites.count', {
                    count: favoriteCount,
                  })}
                  className="ms-auto inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-favorite-badge px-1.5 text-[10px] font-bold leading-none text-on-favorite"
                >
                  {favoriteCount}
                </span>
              )}
            </Link>
          </li>
        </ul>
      </nav>
      {/* Language lives only in the account screen on phones, and the theme
          switcher is a desktop-only control, so neither is duplicated here. */}
      <div className="mt-4 grid min-w-0 grid-cols-2 gap-3 border-t border-line pt-4">
        {isAuthenticated ? (
          <UserMenu onNavigate={onNavigate} />
        ) : status !== 'loading' ? (
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-line bg-action-secondary px-5 py-2.5 text-sm font-semibold text-ink hover:bg-hover focus-visible:ring-3 focus-visible:ring-focus/35"
            onClick={onNavigate}
            state={{ from: returnTo }}
            to="/login"
          >
            {t('actions.login')}
          </Link>
        ) : <span />}
        <Button
          className="min-w-0 px-4"
          href="/dashboard/properties/new"
          onClick={onNavigate}
        >
          {t('actions.addProperty')}
        </Button>
      </div>
    </div>
  )
}
