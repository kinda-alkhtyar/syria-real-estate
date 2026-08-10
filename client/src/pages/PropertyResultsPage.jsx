import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import Button from '../components/ui/Button.jsx'
import Container from '../components/ui/Container.jsx'
import FilterDrawer from '../features/property-results/components/FilterDrawer.jsx'
import ResultGrid from '../features/property-results/components/ResultGrid.jsx'
import ResultFilters from '../features/property-results/components/ResultFilters.jsx'
import ResultSort from '../features/property-results/components/ResultSort.jsx'
import ResultsMobileHeader from '../features/property-results/components/ResultsMobileHeader.jsx'
import { useResultFilterDraft } from '../features/property-results/hooks/useResultFilterDraft.js'
import { usePropertyResults } from '../features/property-results/hooks/usePropertyResults.js'
import { countActiveResultFilters } from '../features/property-results/utils/result-query.js'
import { toPropertyCardModel } from '../features/properties/adapters/to-property-card-model.js'
import { useLocale } from '../hooks/useLocale.js'

const resultsHeadingCopy = {
  default: { description: 'results.description', title: 'results.title' },
  rent: { description: 'results.rentDescription', title: 'results.rentTitle' },
  stays: {
    description: 'results.staysDescription',
    title: 'results.staysTitle',
  },
}

/**
 * Sale-specific headings are defined per locale so that locales without them
 * keep the default headings instead of falling back to English via translate().
 */
const buyHeadingCopy = {
  de: { description: 'results.buyDescription', title: 'results.buyTitle' },
  en: { description: 'results.buyDescription', title: 'results.buyTitle' },
}

/**
 * Composes the complete URL-driven property results experience.
 */
export default function PropertyResultsPage() {
  const { locale, t } = useLocale()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const filterTriggerRef = useRef(null)
  const {
    clearCriteria,
    criteria,
    results,
    retry,
    setPage,
    status,
    updateCriteria,
  } = usePropertyResults()
  const { applyDraft, clearDraft, draft, updateDraft } =
    useResultFilterDraft(criteria, updateCriteria)
  const cards = useMemo(
    () =>
      results.items.map((listing) =>
        toPropertyCardModel(listing, locale.code, t),
      ),
    [locale.code, results.items, t],
  )
  const activeFilterCount = countActiveResultFilters(criteria)
  const headingCopy =
    (criteria.transactionType === 'buy'
      ? buyHeadingCopy[locale.code]
      : undefined) ??
    resultsHeadingCopy[criteria.transactionType] ??
    resultsHeadingCopy.default

  function openFilters(event) {
    filterTriggerRef.current = event.currentTarget
    setFiltersOpen(true)
  }

  return (
    <>
      {/* Phone header from screen 2a: back, criteria summary, gold filter. */}
      <ResultsMobileHeader
        activeFilterCount={activeFilterCount}
        criteria={criteria}
        onOpenFilters={openFilters}
        onSortChange={updateCriteria}
        total={results.total}
      />

      {/* Marketing band is desktop-only; phones open straight into results. */}
      <section className="hidden min-h-[260px] bg-[#F7F4EE] pb-[76px] pt-[44px] lg:block">
        <Container className="desktop:w-[min(1280px,calc(100%-160px))]! desktop:px-0!">
          <p className="max-w-[400px] text-start text-[14px] font-normal leading-[24px] text-[#667085]">
            <Link
              className="transition-colors duration-fast ease-standard hover:text-[#D0A64A]"
              to="/"
            >
              {t('navigation.home')}
            </Link>
            {'  /  '}
            <span className="text-[#D0A64A]">{t('footer.properties')}</span>
          </p>
          <h1
            className="mt-[20px] max-w-[700px] break-words text-start text-[28px] font-semibold leading-[38px] text-[#12243B] [font-family:var(--font-sans)] [text-shadow:0_1px_1px_rgba(208,166,74,0.28),0_3px_14px_rgba(208,166,74,0.42)] sm:text-[34px] sm:leading-[46px] desktop:text-[40px] desktop:leading-[54px]"
            id="search-results-heading"
          >
            {t(headingCopy.title)}
          </h1>
          <p className="mt-[14px] max-w-[700px] text-start text-[18px] font-normal leading-[28px] text-[#667085]">
            {t(headingCopy.description)}
          </p>
        </Container>
      </section>

      <section
        aria-labelledby="search-results-heading"
        className="bg-canvas pb-10 pt-4 sm:py-14 lg:py-16"
      >
        <Container>
        {/* The phone screen keeps every filter inside the sheet, so the quick
            chip track and the active-filter bar are desktop-free surfaces. */}

        {/* Wrapper keeps the approved desktop toolbar markup byte-identical. */}
        <div className="hidden lg:block">
          <div className="flex flex-col gap-4 border-y border-line py-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center justify-between gap-4">
              <p aria-live="polite" className="text-base font-semibold text-ink">
                {t('results.count', { count: results.total })}
              </p>
            </div>
            <ResultSort
              onChange={updateCriteria}
              transactionType={criteria.transactionType}
              value={criteria.sort}
            />
          </div>
        </div>

        {activeFilterCount > 0 && (
          <div className="mt-4 hidden flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 lg:flex">
            <p className="text-sm font-semibold text-ink">
              {t('results.activeFilters', { count: activeFilterCount })}
            </p>
            <Button
              className="min-h-0 px-2 py-1"
              onClick={clearCriteria}
              variant="quiet"
            >
              {t('actions.clearFilters')}
            </Button>
          </div>
        )}

        <div className="mt-8 grid min-w-0 gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <aside
            aria-label={t('results.filters')}
            className="hidden rounded-2xl border border-line bg-surface p-6 lg:block"
          >
            <h2 className="mb-5 border-b border-line pb-4 text-lg font-semibold text-ink">
              {t('results.filters')}
            </h2>
            <ResultFilters
              criteria={draft}
              idPrefix="desktop-filters"
              onApply={applyDraft}
              onClear={clearDraft}
              onDraftChange={updateDraft}
            />
          </aside>

          <div className="min-w-0">
            <ResultGrid
              cards={cards}
              hasPartialData={results.hasPartialData}
              onClear={clearCriteria}
              onPageChange={setPage}
              onRetry={retry}
              page={results.page}
              pageCount={results.pageCount}
              status={status}
              total={results.total}
            />
          </div>
        </div>
        </Container>

        <FilterDrawer
          criteria={draft}
          onApply={applyDraft}
          onClear={clearDraft}
          onClose={() => setFiltersOpen(false)}
          onDraftChange={updateDraft}
          open={filtersOpen}
          returnFocusRef={filterTriggerRef}
          total={results.total}
        />
      </section>
    </>
  )
}
