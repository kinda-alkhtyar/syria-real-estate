import { LoaderCircle } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

import Container from '../../../components/ui/Container.jsx'
import { useLocale } from '../../../hooks/useLocale.js'

export function AuthenticationLoadingState() {
  const { t } = useLocale()

  return (
    <Container>
      <div
        aria-live="polite"
        className="flex min-h-64 items-center justify-center gap-3 text-muted"
        role="status"
      >
        <LoaderCircle
          aria-hidden="true"
          className="animate-spin motion-reduce:animate-none"
          size={22}
        />
        <span className="font-semibold">{t('auth.restoringSession')}</span>
      </div>
    </Container>
  )
}

export function ForbiddenState() {
  const headingRef = useRef(null)
  const { t } = useLocale()

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <Container>
      <section
        aria-labelledby="forbidden-title"
        className="mx-auto max-w-xl py-16 text-center sm:py-24"
      >
        <p className="text-sm font-bold uppercase tracking-wide text-error">
          {t('auth.forbiddenCode')}
        </p>
        <h1
          className="mt-3 text-3xl font-bold text-ink"
          id="forbidden-title"
          ref={headingRef}
          tabIndex={-1}
        >
          {t('auth.forbiddenTitle')}
        </h1>
        <p className="mt-3 leading-7 text-muted">
          {t('auth.forbiddenDescription')}
        </p>
        <Link
          className="mt-7 inline-flex min-h-11 items-center justify-center rounded-xl bg-action px-5 py-2.5 text-sm font-semibold text-on-action outline-none hover:bg-action-hover focus-visible:ring-3 focus-visible:ring-focus/35 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          to="/"
        >
          {t('auth.returnHome')}
        </Link>
      </section>
    </Container>
  )
}
