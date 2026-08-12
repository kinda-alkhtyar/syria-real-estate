import { Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'

import Button from '../components/ui/Button.jsx'
import Container from '../components/ui/Container.jsx'
import Logo from '../components/common/Logo.jsx'
import { ApiError } from '../api/api-client.js'
import GoogleSignInButton from '../features/auth/components/GoogleSignInButton.jsx'
import { useAuth } from '../features/auth/hooks/useAuth.js'
import { getSafeReturnPath } from '../features/auth/routing/route-access.js'
import { useLocale } from '../hooks/useLocale.js'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [errorKey, setErrorKey] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { isAuthenticated, login, loginWithGoogle, status } = useAuth()
  const { t } = useLocale()
  const location = useLocation()
  const navigate = useNavigate()
  const returnTo = getSafeReturnPath(location.state)

  useEffect(() => {
    const previousTitle = document.title
    document.title = `${t('auth.loginTitle')} | ${t('brand.name')}`
    return () => {
      document.title = previousTitle
    }
  }, [t])

  if (isAuthenticated) {
    return <Navigate replace to={returnTo} />
  }

  function errorKeyFor(error) {
    if (!(error instanceof ApiError)) return 'auth.requestError'
    if (error.code === 'CONFIGURATION_MISSING') return 'auth.googleUnavailable'
    if (error.code === 'GOOGLE_UNAVAILABLE') return 'auth.googleUnavailable'
    if (error.code === 'INVALID_GOOGLE_CREDENTIAL') return 'auth.googleError'
    if (error.code === 'ACCOUNT_DISABLED') return 'auth.accountDisabled'
    if (error.code === 'NETWORK_ERROR') return 'auth.networkError'
    return 'auth.requestError'
  }

  async function handleGoogleCredential(credential) {
    setErrorKey('')
    setIsSubmitting(true)
    try {
      await loginWithGoogle(credential)
      navigate(returnTo, { replace: true })
    } catch (error) {
      setErrorKey(errorKeyFor(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorKey('')
    setIsSubmitting(true)

    const form = new FormData(event.currentTarget)
    try {
      await login({
        email: form.get('email'),
        password: form.get('password'),
      })
      navigate(returnTo, { replace: true })
    } catch (error) {
      if (error instanceof ApiError && error.code === 'INVALID_CREDENTIALS') {
        setErrorKey('auth.invalidCredentials')
      } else if (
        error instanceof ApiError &&
        error.code === 'NETWORK_ERROR'
      ) {
        setErrorKey('auth.networkError')
      } else {
        setErrorKey('auth.requestError')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="py-12 sm:py-18">
      <Container>
        <div className="mx-auto max-w-md rounded-3xl border border-line bg-surface p-6 shadow-sm sm:p-8">
          <Logo className="mb-1" />
          <h1 className="mt-2 text-3xl font-bold text-ink">
            {t('auth.loginTitle')}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            {t('auth.loginDescription')}
          </p>

          <form className="mt-8 grid gap-5" onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-sm font-semibold text-ink" htmlFor="email">
                {t('auth.email')}
              </label>
              <input
                autoComplete="email"
                className="min-h-12 w-full rounded-xl border border-input-line bg-canvas px-4 text-ink outline-none focus-visible:ring-3 focus-visible:ring-focus/35"
                id="email"
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-ink" htmlFor="password">
                {t('auth.password')}
              </label>
              <div className="relative">
                <input
                  autoComplete="current-password"
                  className="min-h-12 w-full rounded-xl border border-input-line bg-canvas px-4 pe-12 text-ink outline-none focus-visible:ring-3 focus-visible:ring-focus/35"
                  id="password"
                  name="password"
                  required
                  type={showPassword ? 'text' : 'password'}
                />
                <button
                  aria-label={t(showPassword ? 'auth.hidePassword' : 'auth.showPassword')}
                  className="absolute inset-y-0 end-1 inline-flex w-11 items-center justify-center rounded-lg text-muted hover:text-ink focus-visible:ring-3 focus-visible:ring-focus/35"
                  onClick={() => setShowPassword((visible) => !visible)}
                  type="button"
                >
                  {showPassword ? <EyeOff aria-hidden="true" size={20} /> : <Eye aria-hidden="true" size={20} />}
                </button>
              </div>
            </div>

            {errorKey && (
              <p aria-live="polite" className="rounded-xl bg-hover px-4 py-3 text-sm font-semibold text-ink" role="alert">
                {t(errorKey)}
              </p>
            )}

            <Button className="w-full" disabled={isSubmitting || status === 'loading'} type="submit">
              {isSubmitting && <LoaderCircle aria-hidden="true" className="animate-spin" size={18} />}
              {isSubmitting ? t('auth.signingIn') : t('actions.login')}
            </Button>
          </form>

          {/* Renders nothing unless VITE_GOOGLE_CLIENT_ID is configured. */}
          <GoogleSignInButton
            busy={isSubmitting}
            onCredential={handleGoogleCredential}
          />
        </div>
      </Container>
    </section>
  )
}
