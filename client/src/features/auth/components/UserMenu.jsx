import { LayoutDashboard, LogOut, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useLocale } from '../../../hooks/useLocale.js'
import { useAuth } from '../hooks/useAuth.js'

export default function UserMenu({ onNavigate }) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const { logout, user } = useAuth()
  const { t } = useLocale()

  async function handleLogout() {
    setIsLoggingOut(true)
    try {
      await logout()
      onNavigate?.()
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <details className="group relative">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl px-3 text-sm font-semibold text-ink hover:bg-hover focus-visible:ring-3 focus-visible:ring-focus/30">
        <UserRound aria-hidden="true" size={18} />
        <span className="max-w-32 truncate">{user?.name}</span>
      </summary>
      <div className="absolute end-0 top-full z-10 mt-2 min-w-48 rounded-xl border border-line bg-elevated p-2 shadow-lg">
        {user?.email && (
          <p className="truncate px-3 py-2 text-xs text-muted">
            {user.email}
          </p>
        )}
        {['OWNER', 'ADMIN'].includes(user?.role) && (
          <Link
            className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-ink hover:bg-hover focus-visible:ring-3 focus-visible:ring-focus/30"
            onClick={onNavigate}
            to="/dashboard"
          >
            <LayoutDashboard aria-hidden="true" size={18} />
            {t('dashboard.navigation.overview')}
          </Link>
        )}
        <button
          className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-sm font-semibold text-ink hover:bg-hover focus-visible:ring-3 focus-visible:ring-focus/30 disabled:opacity-60"
          disabled={isLoggingOut}
          onClick={handleLogout}
          type="button"
        >
          <LogOut aria-hidden="true" size={18} />
          {isLoggingOut ? t('auth.signingOut') : t('actions.logout')}
        </button>
      </div>
    </details>
  )
}
