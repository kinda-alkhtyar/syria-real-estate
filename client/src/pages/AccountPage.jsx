import {
  ChevronLeft,
  Globe,
  Heart,
  House,
  LogOut,
  UserRound,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { useAuth } from '../features/auth/hooks/useAuth.js'
import { useManagementProperties } from '../features/management/hooks/useManagementProperties.js'
import { useFavorites } from '../hooks/useFavorites.js'
import { useLocale } from '../hooks/useLocale.js'

const rowClassName =
  'flex min-h-14 w-full items-center gap-3.5 border-b border-home-card-border px-4 py-3 text-start outline-none transition-colors duration-fast ease-standard focus-visible:ring-3 focus-visible:ring-focus/30 motion-reduce:transition-none'

function RowIcon({ children, tone = 'default' }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] ${
        tone === 'danger'
          ? 'bg-error/10 text-error'
          : 'bg-home-section text-home-heading'
      }`}
    >
      {children}
    </span>
  )
}

function RowLabel({ children, tone = 'default' }) {
  return (
    <span
      className={`flex-1 truncate text-[13.5px] font-semibold ${
        tone === 'danger' ? 'text-error' : 'text-home-heading'
      }`}
    >
      {children}
    </span>
  )
}

function RowChevron() {
  return (
    <ChevronLeft
      aria-hidden="true"
      className="shrink-0 text-home-muted ltr:-scale-x-100"
      size={14}
    />
  )
}

function CountBadge({ tone = 'quiet', value }) {
  return (
    <span
      className={`inline-flex min-w-6 shrink-0 items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
        tone === 'gold'
          ? 'bg-home-gold text-home-on-gold'
          : 'bg-home-section text-home-heading'
      }`}
    >
      {value}
    </span>
  )
}

/**
 * "My properties" for accounts that can manage listings. It is a child component
 * so the management request is only issued for OWNER and ADMIN roles — every
 * other role would be rejected by the same endpoint.
 */
function ManagedPropertiesRow() {
  const { meta, status } = useManagementProperties()
  const { t } = useLocale()
  const total = meta?.total

  return (
    <Link className={rowClassName} to="/dashboard">
      <RowIcon>
        <House size={16} strokeWidth={1.8} />
      </RowIcon>
      <RowLabel>{t('account.myProperties')}</RowLabel>
      {status === 'ready' && total > 0 && (
        <CountBadge tone="gold" value={total} />
      )}
      <RowChevron />
    </Link>
  )
}

/**
 * Account hub for phones and portrait tablets, matching screen 6a of the
 * approved mobile design: the navy identity banner followed by the settings
 * rows. Language switching lives here and nowhere else on phones.
 *
 * The profile row opens `/account/profile`, which is guarded: a visitor who
 * taps it is sent to sign-in, which is the same place the row below offers.
 */
export default function AccountPage() {
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const { count: favoriteCount } = useFavorites()
  const { isAuthenticated, logout, user } = useAuth()
  const { locale, locales, setLocale, t } = useLocale()
  const location = useLocation()
  const canManage = ['ADMIN', 'OWNER'].includes(user?.role)
  const displayName = isAuthenticated ? user?.name : t('account.guest')
  const initial = displayName?.trim().charAt(0) ?? ''

  async function handleLogout() {
    setIsLoggingOut(true)
    try {
      await logout()
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="mx-auto min-h-[70svh] max-w-[520px] bg-canvas pb-6">
      <header className="flex items-center gap-3.5 bg-home-band px-4 py-5">
        <span
          aria-hidden="true"
          className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-home-gold text-xl font-extrabold text-home-on-gold"
        >
          {initial || <UserRound size={24} />}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-[15px] font-extrabold text-home-band-text">
            {displayName}
          </h1>
          <p className="mt-0.5 truncate text-xs text-home-band-text/65">
            {isAuthenticated ? user?.email : t('account.guestDescription')}
          </p>
        </div>
      </header>

      <div className="bg-home-panel">
        <Link className={rowClassName} to="/account/profile">
          <RowIcon>
            <UserRound size={16} strokeWidth={1.8} />
          </RowIcon>
          <RowLabel>{t('account.profile')}</RowLabel>
          <RowChevron />
        </Link>

        {canManage && <ManagedPropertiesRow />}

        <Link className={rowClassName} to="/favorites">
          <RowIcon>
            <Heart size={16} strokeWidth={1.8} />
          </RowIcon>
          <RowLabel>{t('favorites.title')}</RowLabel>
          {favoriteCount > 0 && <CountBadge value={favoriteCount} />}
          <RowChevron />
        </Link>

        {/* The row looks like the design's static value; the invisible native
            select on top of it is the only language switcher on phones. */}
        <div className={`${rowClassName} relative`}>
          <RowIcon>
            <Globe size={16} strokeWidth={1.8} />
          </RowIcon>
          <label className="sr-only" htmlFor="account-language">
            {t('accessibility.chooseLanguage')}
          </label>
          <RowLabel>{t('account.language')}</RowLabel>
          <span
            aria-hidden="true"
            className="shrink-0 text-xs text-home-muted"
          >
            {t(`languages.${locale.code}`)}
          </span>
          <RowChevron />
          <select
            className="absolute inset-0 size-full cursor-pointer appearance-none opacity-0"
            id="account-language"
            onChange={(event) => setLocale(event.target.value)}
            value={locale.code}
          >
            {locales.map((localeOption) => (
              <option key={localeOption.code} value={localeOption.code}>
                {t(`languages.${localeOption.code}`)}
              </option>
            ))}
          </select>
        </div>

        {isAuthenticated ? (
          <button
            className={`${rowClassName} border-b-0 disabled:opacity-60`}
            disabled={isLoggingOut}
            onClick={handleLogout}
            type="button"
          >
            <RowIcon tone="danger">
              <LogOut size={16} strokeWidth={1.8} />
            </RowIcon>
            <RowLabel tone="danger">
              {isLoggingOut ? t('auth.signingOut') : t('actions.logout')}
            </RowLabel>
          </button>
        ) : (
          <Link
            className={`${rowClassName} border-b-0`}
            state={{ from: `${location.pathname}${location.search}` }}
            to="/login"
          >
            <RowIcon>
              <UserRound size={16} strokeWidth={1.8} />
            </RowIcon>
            <RowLabel>{t('actions.login')}</RowLabel>
            <RowChevron />
          </Link>
        )}
      </div>
    </div>
  )
}
