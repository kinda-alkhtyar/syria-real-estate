import { useEffect, useRef, useState } from 'react'

import { useLocale } from '../../../hooks/useLocale.js'
import { useTheme } from '../../../hooks/useTheme.js'

const scriptSource = 'https://accounts.google.com/gsi/client'

// Google clamps the rendered button to this range.
const minimumWidth = 200
const maximumWidth = 400

let scriptPromise

function loadIdentityServices() {
  if (window.google?.accounts?.id) return Promise.resolve()

  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.async = true
    script.defer = true
    script.src = scriptSource
    script.addEventListener('load', () => resolve())
    script.addEventListener('error', () => {
      // Allow a later attempt to retry instead of caching the failure.
      scriptPromise = undefined
      reject(new Error('Google Identity Services could not be loaded.'))
    })
    document.head.append(script)
  })

  return scriptPromise
}

/**
 * Renders the official Google Identity Services button.
 *
 * The button is drawn by Google inside its own iframe, which is what keeps the
 * credential out of reach of page scripts; its label is localized by Google
 * through the `locale` option rather than by the message files. Nothing renders
 * unless `VITE_GOOGLE_CLIENT_ID` is configured.
 */
export default function GoogleSignInButton({ busy = false, onCredential }) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim()
  const containerRef = useRef(null)
  const credentialHandler = useRef(onCredential)
  const [unavailable, setUnavailable] = useState(false)
  const { locale, t } = useLocale()
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    credentialHandler.current = onCredential
  }, [onCredential])

  useEffect(() => {
    if (!clientId) return undefined
    let cancelled = false

    loadIdentityServices()
      .then(() => {
        const identity = window.google?.accounts?.id
        if (cancelled || !containerRef.current) return
        if (!identity) {
          setUnavailable(true)
          return
        }

        identity.initialize({
          callback: (response) => {
            if (response?.credential) {
              credentialHandler.current?.(response.credential)
            }
          },
          client_id: clientId,
        })
        // Re-rendering on locale or theme change replaces the previous button.
        containerRef.current.replaceChildren()
        identity.renderButton(containerRef.current, {
          locale: locale.code,
          logo_alignment: 'center',
          shape: 'pill',
          size: 'large',
          text: 'signin_with',
          theme: resolvedTheme === 'dark' ? 'filled_black' : 'outline',
          width: Math.min(
            Math.max(containerRef.current.clientWidth, minimumWidth),
            maximumWidth,
          ),
        })
        setUnavailable(false)
      })
      .catch(() => {
        if (!cancelled) setUnavailable(true)
      })

    return () => {
      cancelled = true
    }
  }, [clientId, locale.code, resolvedTheme])

  if (!clientId) return null

  return (
    <div className="mt-6">
      <div aria-hidden="true" className="mb-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          {t('auth.orDivider')}
        </span>
        <span className="h-px flex-1 bg-line" />
      </div>
      <div
        aria-label={t('auth.googleSignIn')}
        className={`flex min-h-11 justify-center [color-scheme:light] ${
          busy ? 'pointer-events-none opacity-60' : ''
        }`}
        ref={containerRef}
        role="group"
      />
      {unavailable && (
        <p className="mt-3 text-sm font-semibold text-error" role="alert">
          {t('auth.googleUnavailable')}
        </p>
      )}
    </div>
  )
}
