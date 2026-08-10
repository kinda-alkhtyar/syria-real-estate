import { Heart, Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { navigationItems } from '../../constants/navigation.js'
import { useLocale } from '../../hooks/useLocale.js'
import { useFavorites } from '../../hooks/useFavorites.js'
import UserMenu from '../../features/auth/components/UserMenu.jsx'
import { useAuth } from '../../features/auth/hooks/useAuth.js'
import LanguageSelector from '../common/LanguageSelector.jsx'
import Logo from '../common/Logo.jsx'
import Button from '../ui/Button.jsx'
import Container from '../ui/Container.jsx'
import IconButton from '../ui/IconButton.jsx'
import MobileNavigation from './MobileNavigation.jsx'

const mobileNavigationId = 'mobile-navigation'

/**
 * @param {object} props
 * @param {string} [props.className] Extra root classes. `MainLayout` uses it to
 *   keep this shell desktop-only on every screen that owns a header from the
 *   approved mobile design.
 */
export default function Header({ className = '' }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const { count: favoriteCount } = useFavorites()
  const { isAuthenticated, status } = useAuth()
  const { t } = useLocale()
  const location = useLocation()
  const currentPath = `${location.pathname}${location.search}`
  const favoritesLabel =
    favoriteCount > 0
      ? t('favorites.count', { count: favoriteCount })
      : t('favorites.title')

  const favoriteIcon = (
    <span className="relative shrink-0">
      <Heart
        aria-hidden="true"
        data-favorite-icon
        size={19}
      />
      {favoriteCount > 0 && (
        <span
          aria-hidden="true"
          className="absolute -end-2 -top-2 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-favorite-badge px-1 text-[10px] font-bold leading-none text-on-favorite"
        >
          {favoriteCount}
        </span>
      )}
    </span>
  )

  function closeMenu() {
    setIsMenuOpen(false)
  }

  useEffect(() => {
    const desktopQuery = window.matchMedia('(min-width: 90rem)')

    function handleScroll() {
      setIsScrolled(window.scrollY > 4)
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        closeMenu()
      }
    }

    function handleDesktopChange(event) {
      if (event.matches) {
        closeMenu()
      }
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('keydown', handleKeyDown)
    desktopQuery.addEventListener('change', handleDesktopChange)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('keydown', handleKeyDown)
      desktopQuery.removeEventListener('change', handleDesktopChange)
    }
  }, [])

  useEffect(() => {
    if (!isMenuOpen) {
      return undefined
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isMenuOpen])

  return (
    <header
      className={`sticky top-0 z-header h-16 border-b border-[#E5E7EB] bg-[color:var(--surface-elevated)] transition-[border-color,box-shadow,background-color] duration-standard ease-standard motion-reduce:transition-none desktop:h-[140px] ${
        isScrolled ? 'shadow-sm' : ''
      } ${className}`}
    >
      <Container className="h-full desktop:w-[min(1280px,calc(100%-160px))]! desktop:px-0!">
        <div className="flex h-full items-center justify-between gap-3 desktop:gap-6">
          <div className="flex min-w-0 items-center">
            <Logo
              className="h-12 w-[110px] shrink-0 desktop:h-[79px] desktop:w-[180px]"
              imageClassName="block h-full w-full object-contain object-left rtl:object-right"
            />
          </div>

          <nav
            aria-label={t('accessibility.primaryNavigation')}
            className="hidden items-center gap-[28px] desktop:flex [&:lang(de)]:gap-[22px]"
          >
            {navigationItems.map((item) => {
              const isActive = !item.href.includes('#') && item.href === currentPath

              return (
                <a
                  key={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`inline-flex items-center whitespace-nowrap text-[18px] font-normal leading-[24px] transition duration-fast ease-standard ${
                    isActive
                      ? 'text-[#D0A64A]'
                      : 'text-[#12243B] hover:text-[#D0A64A]'
                  }`}
                  href={item.href}
                >
                  {t(item.labelKey)}
                </a>
              )
            })}
          </nav>

          <div className="hidden items-center gap-4 desktop:flex">
            <LanguageSelector />

            {isAuthenticated ? (
              <UserMenu />
            ) : status !== 'loading' ? (
              <Link
                className="text-[18px] font-normal leading-[26px] text-black transition-colors duration-150 hover:text-[#D0A64A]"
                state={{ from: currentPath }}
                to="/login"
              >
                {t('actions.login')}
              </Link>
            ) : null}

            <Button
              className="h-[46px]! min-h-[46px]! rtl:w-[127px]! ltr:w-auto! ltr:min-w-[127px]! shrink-0 whitespace-nowrap rounded-[10px]! border-transparent! bg-[#D0A64A]! px-[18px]! py-[10px]! text-[18px]! font-normal! leading-[26px]! text-[#12243B]! shadow-none! [font-family:'Noto_Sans_Arabic',sans-serif]! [&:lang(en)]:[font-family:var(--font-sans)]! [&:lang(de)]:[font-family:var(--font-sans)]! hover:border-transparent! hover:bg-[#d8b15a]!"
              href="/dashboard/properties/new"
              variant="secondary"
            >
              {t('actions.addProperty')}
            </Button>
          </div>

          <div className="flex items-center justify-self-end gap-1 desktop:hidden">
            <Link
              aria-label={favoritesLabel}
              className="favorite-button inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-xl bg-transparent px-3 text-sm font-semibold text-ink transition duration-200 ease-standard hover:bg-hover focus-visible:ring-3 focus-visible:ring-focus/30 motion-reduce:transition-none sm:justify-start"
              data-favorite={favoriteCount > 0}
              to="/favorites"
            >
              {favoriteIcon}
              <span className="hidden whitespace-nowrap sm:inline">
                {t('favorites.title')}
              </span>
            </Link>
            <IconButton
              aria-controls={mobileNavigationId}
              aria-expanded={isMenuOpen}
              label={
                isMenuOpen
                  ? t('accessibility.closeNavigation')
                  : t('accessibility.openNavigation')
              }
              onClick={() => setIsMenuOpen((currentValue) => !currentValue)}
            >
              {isMenuOpen ? (
                <X aria-hidden="true" size={21} />
              ) : (
                <Menu aria-hidden="true" size={21} />
              )}
            </IconButton>
          </div>
        </div>
      </Container>

      <MobileNavigation
        id={mobileNavigationId}
        isOpen={isMenuOpen}
        items={navigationItems}
        onNavigate={closeMenu}
        returnTo={`${location.pathname}${location.search}`}
      />
    </header>
  )
}
