import { Building2 } from 'lucide-react'
import { Link } from 'react-router-dom'

import Container from '../components/ui/Container.jsx'
import { useLocale } from '../hooks/useLocale.js'

/**
 * Placeholder destination for the offices tab.
 *
 * No office entity exists in the API, so this page only announces the upcoming
 * capability and routes back into the existing property list. The phone screen
 * follows the approved "no offices" state; the populated office list from the
 * design cannot be built until an offices endpoint exists.
 */
export default function OfficesPage() {
  const { t } = useLocale()

  return (
    <>
      <section
        aria-labelledby="offices-title-mobile"
        className="flex min-h-[70svh] flex-col bg-canvas lg:hidden"
      >
        <div className="border-b border-home-card-border bg-home-panel px-4 py-4">
          <h1
            className="text-lg font-bold leading-tight text-home-heading"
            id="offices-title-mobile"
          >
            {t('offices.title')}
          </h1>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-3.5 px-10 py-14 text-center">
          <span
            aria-hidden="true"
            className="inline-flex size-16 items-center justify-center rounded-full border border-home-card-border bg-home-panel text-home-heading"
          >
            <Building2 size={28} strokeWidth={1.6} />
          </span>
          <span className="inline-flex items-center rounded-full bg-home-gold px-3 py-1 text-[11px] font-bold text-home-on-gold">
            {t('offices.badge')}
          </span>
          <p className="text-[12.5px] leading-[1.6] text-home-muted">
            {t('offices.description')}
          </p>
          <Link
            className="mt-1.5 inline-flex min-h-11 items-center justify-center rounded-full bg-home-band px-7 text-[13px] font-bold text-home-band-text outline-none transition duration-standard ease-standard focus-visible:ring-3 focus-visible:ring-focus/35 motion-reduce:transition-none"
            to="/properties"
          >
            {t('actions.browseAll')}
          </Link>
        </div>
      </section>

      <section
        aria-labelledby="offices-title"
        className="hidden bg-canvas py-14 sm:py-20 lg:block"
      >
        <Container>
          <div className="mx-auto flex max-w-[420px] flex-col items-center rounded-[20px] border border-home-card-border bg-home-panel px-6 py-10 text-center shadow-[var(--shadow-sm)]">
            <span
              aria-hidden="true"
              className="inline-flex size-16 items-center justify-center rounded-full bg-home-gold-soft text-home-gold"
            >
              <Building2 size={30} strokeWidth={1.6} />
            </span>
            <span className="mt-5 inline-flex items-center rounded-full bg-home-gold px-3 py-1 text-xs font-bold text-home-on-gold">
              {t('offices.badge')}
            </span>
            <h1
              className="mt-4 text-2xl font-semibold text-home-heading"
              id="offices-title"
            >
              {t('offices.title')}
            </h1>
            <p className="mt-3 text-base leading-7 text-home-muted">
              {t('offices.description')}
            </p>
            <Link
              className="mt-7 inline-flex min-h-11 items-center justify-center rounded-xl bg-home-button px-6 text-sm font-semibold text-home-button-text outline-none transition duration-standard ease-standard focus-visible:ring-3 focus-visible:ring-focus/35 motion-reduce:transition-none"
              to="/properties"
            >
              {t('actions.browseAll')}
            </Link>
          </div>
        </Container>
      </section>
    </>
  )
}
