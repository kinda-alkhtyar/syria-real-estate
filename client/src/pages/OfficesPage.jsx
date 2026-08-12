import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import Container from '../components/ui/Container.jsx'
import { toOfficeCardModel } from '../features/offices/adapters/to-office-model.js'
import MyOfficePanel from '../features/offices/components/MyOfficePanel.jsx'
import OfficeCard from '../features/offices/components/OfficeCard.jsx'
import OfficesSkeleton from '../features/offices/components/OfficesSkeleton.jsx'
import OfficesState from '../features/offices/components/OfficesState.jsx'
import { useMyOffice } from '../features/offices/hooks/useMyOffice.js'
import { useOffices } from '../features/offices/hooks/useOffices.js'
import ResultPagination from '../features/property-results/components/ResultPagination.jsx'
import { useLocale } from '../hooks/useLocale.js'

function readPage(searchParams) {
  const page = Number.parseInt(searchParams.get('page') ?? '1', 10)
  return Number.isFinite(page) && page > 0 ? page : 1
}

/**
 * The offices tab: every published office, paginated, as a responsive grid.
 */
export default function OfficesPage() {
  const { locale, t } = useLocale()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = readPage(searchParams)
  const { meta, offices, retry, status } = useOffices(page)
  const myOffice = useMyOffice()
  const cards = useMemo(
    () => offices.map((office) => toOfficeCardModel(office, locale.code, t)),
    [locale.code, offices, t],
  )

  function goToPage(nextPage) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.set('page', String(nextPage))
      return next
    })
    window.scrollTo({ behavior: 'smooth', top: 0 })
  }

  function content() {
    if (status === 'loading') return <OfficesSkeleton />
    if (status === 'error') {
      return <OfficesState onAction={retry} type="error" />
    }
    if (status === 'empty') return <OfficesState type="empty" />

    return (
      <>
        <ul className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((office) => (
            <li className="min-w-0" key={office.id}>
              <OfficeCard office={office} />
            </li>
          ))}
        </ul>
        <ResultPagination
          ariaLabel={t('accessibility.officesPagination')}
          onChange={goToPage}
          page={meta?.page ?? page}
          pageCount={meta?.totalPages ?? 1}
        />
      </>
    )
  }

  return (
    <>
      {/* Phone header band, unchanged from the tab's previous screen. */}
      <div className="border-b border-home-card-border bg-home-panel px-4 py-4 lg:hidden">
        <h1
          className="text-lg font-bold leading-tight text-home-heading"
          id="offices-title-mobile"
        >
          {t('offices.title')}
        </h1>
        <p className="mt-1 text-[12.5px] leading-[1.6] text-home-muted">
          {t('offices.description')}
        </p>
      </div>

      <section
        aria-label={t('offices.title')}
        className="bg-canvas pb-10 pt-4 sm:py-14 lg:py-16"
      >
        <Container>
          <div className="mb-8 hidden lg:block">
            <h1
              className="text-3xl font-semibold text-ink"
              id="offices-title"
            >
              {t('offices.title')}
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
              {t('offices.description')}
            </p>
          </div>

          <MyOfficePanel office={myOffice.office} status={myOffice.status} />

          {content()}
        </Container>
      </section>
    </>
  )
}
