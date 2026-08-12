import { ArrowLeft, Building2, MapPin, MessageCircle, Phone } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import Container from '../components/ui/Container.jsx'
import { toOfficeDetailsModel } from '../features/offices/adapters/to-office-model.js'
import OfficeAvatar from '../features/offices/components/OfficeAvatar.jsx'
import OfficeDetailsSkeleton from '../features/offices/components/OfficeDetailsSkeleton.jsx'
import OfficesState from '../features/offices/components/OfficesState.jsx'
import { useOfficeDetails } from '../features/offices/hooks/useOfficeDetails.js'
import { fromPropertyApi } from '../features/properties/adapters/from-property-api.js'
import { toPropertyCardModel } from '../features/properties/adapters/to-property-card-model.js'
import PropertyCard from '../features/properties/components/PropertyCard.jsx'
import ResultPagination from '../features/property-results/components/ResultPagination.jsx'
import { useLocale } from '../hooks/useLocale.js'

function readPage(searchParams) {
  const page = Number.parseInt(searchParams.get('page') ?? '1', 10)
  return Number.isFinite(page) && page > 0 ? page : 1
}

/**
 * Public office page: the office itself, then the listings it publishes.
 */
export default function OfficeDetailsPage() {
  const { officeId } = useParams()
  const { locale, t } = useLocale()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = readPage(searchParams)
  const { office, properties, retry, status } = useOfficeDetails(officeId, page)

  const model = useMemo(
    () => (office ? toOfficeDetailsModel(office, locale.code, t) : null),
    [locale.code, office, t],
  )
  const cards = useMemo(
    () =>
      (properties?.data ?? []).map((listing) =>
        toPropertyCardModel(
          fromPropertyApi(listing, locale.code),
          locale.code,
          t,
        ),
      ),
    [locale.code, properties, t],
  )

  function goToPage(nextPage) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.set('page', String(nextPage))
      return next
    })
    window.scrollTo({ behavior: 'smooth', top: 0 })
  }

  return (
    <section className="bg-canvas pb-12 pt-4 sm:py-14 lg:py-16">
      <Container>
        <Link
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted outline-none transition-colors duration-standard ease-standard hover:text-ink focus-visible:ring-3 focus-visible:ring-focus/35 motion-reduce:transition-none"
          to="/offices"
        >
          <ArrowLeft aria-hidden="true" className="rtl:-scale-x-100" size={18} />
          {t('offices.details.back')}
        </Link>

        <div className="mt-4">
          {status === 'loading' && <OfficeDetailsSkeleton />}

          {status === 'error' && <OfficesState onAction={retry} type="error" />}

          {status === 'notFound' && (
            <OfficesState
              onAction={() => navigate('/offices')}
              type="notFound"
            />
          )}

          {status === 'ready' && model && (
            <>
              <article className="rounded-2xl border border-line bg-elevated p-5 shadow-[var(--shadow-sm)] sm:p-6">
                <div className="flex gap-4 sm:gap-5">
                  <OfficeAvatar
                    initials={model.initials}
                    logoUrl={model.logoUrl}
                    size="lg"
                  />
                  <div className="min-w-0 flex-1">
                    <h1 className="text-xl font-semibold leading-snug text-ink sm:text-2xl">
                      {model.name}
                    </h1>
                    {model.location && (
                      <p className="mt-2 flex min-w-0 items-center gap-1.5 text-sm text-muted">
                        <MapPin aria-hidden="true" className="shrink-0" size={16} />
                        <span className="truncate">{model.location}</span>
                      </p>
                    )}
                    <span className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-bold text-ink">
                      <Building2 aria-hidden="true" size={13} />
                      {t('offices.count', { count: model.propertyCount })}
                    </span>
                  </div>
                </div>

                {model.description && (
                  <p className="mt-5 whitespace-pre-line text-sm leading-7 text-muted sm:text-base">
                    {model.description}
                  </p>
                )}

                {/* Same contact treatment as a listing: WhatsApp leads, the
                    call button is the compact secondary action, and neither is
                    rendered when the office saved no number. */}
                {(model.whatsappHref || model.callHref) && (
                  <div className="mt-5 flex gap-2 border-t border-line pt-5">
                    {model.whatsappHref && (
                      <a
                        className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-whatsapp px-5 text-sm font-semibold text-on-whatsapp outline-none transition-colors duration-standard ease-standard hover:bg-whatsapp-hover focus-visible:ring-3 focus-visible:ring-focus/35 motion-reduce:transition-none sm:max-w-64"
                        href={model.whatsappHref}
                        rel="noreferrer noopener"
                        target="_blank"
                      >
                        <MessageCircle aria-hidden="true" size={18} />
                        {t('offices.details.whatsapp')}
                      </a>
                    )}
                    {model.callHref && (
                      <a
                        aria-label={t('offices.details.call')}
                        className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-ink outline-none transition-colors duration-standard ease-standard hover:bg-hover focus-visible:ring-3 focus-visible:ring-focus/35 motion-reduce:transition-none"
                        href={model.callHref}
                      >
                        <Phone aria-hidden="true" size={18} />
                      </a>
                    )}
                  </div>
                )}
              </article>

              <h2
                className="mt-10 text-lg font-semibold text-ink sm:text-xl"
                id="office-properties-title"
              >
                {t('offices.details.properties.title')}
              </h2>

              <div className="mt-4">
                {cards.length === 0 ? (
                  <OfficesState type="propertiesEmpty" />
                ) : (
                  <>
                    <ul
                      aria-labelledby="office-properties-title"
                      className="grid gap-3 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3"
                    >
                      {cards.map((card) => (
                        <li className="min-w-0" key={card.id}>
                          <PropertyCard {...card} />
                        </li>
                      ))}
                    </ul>
                    <ResultPagination
                      onChange={goToPage}
                      page={properties?.meta?.page ?? page}
                      pageCount={properties?.meta?.totalPages ?? 1}
                    />
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </Container>
    </section>
  )
}
