import { ChevronDown, ChevronLeft, Search, SlidersHorizontal } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { syrianGovernorates } from '../../../constants/syrian-governorates.js'
import { useLocale } from '../../../hooks/useLocale.js'
import { propertyTypes } from '../../property-search/constants/property-types.js'
import { transactionTypes } from '../../property-search/constants/search-options.js'
import { resultSortOptions } from '../constants/result-options.js'

/** Punctuation, not copy: keeps the summary readable in RTL and LTR alike. */
const summarySeparator = ' · '

/**
 * Describes the applied criteria the way screen 2a shows them inside the search
 * field. The results API has no free-text parameter, so the field summarises the
 * structured criteria instead of pretending to accept a query.
 */
function describeCriteria(criteria, t) {
  const parts = [
    propertyTypes.find((option) => option.id === criteria.propertyType),
    syrianGovernorates.find((option) => option.id === criteria.governorate),
    transactionTypes.find((option) => option.id === criteria.transactionType),
  ]
    .filter(Boolean)
    .map((option) => t(option.labelKey))

  return parts.join(summarySeparator)
}

/**
 * Phone header for the results screen: back, the criteria summary that opens the
 * filter sheet, and the gold filter button. Hidden from `lg` upwards, where the
 * marketing header and the permanent sidebar stay authoritative.
 */
export default function ResultsMobileHeader({
  activeFilterCount,
  criteria,
  onOpenFilters,
  onSortChange,
  total,
}) {
  const { t } = useLocale()
  const navigate = useNavigate()
  const summary = describeCriteria(criteria, t)
  const availableSortOptions = criteria.transactionType
    ? resultSortOptions
    : resultSortOptions.filter((option) => option.id === 'newest')
  const activeSort =
    resultSortOptions.find((option) => option.id === criteria.sort) ??
    resultSortOptions[0]

  return (
    <div className="sticky top-0 z-header lg:hidden">
      {/* The desktop marketing band owns the visible h1 and is hidden here. */}
      <h1 className="sr-only">
        {t(`results.compactTitle.${criteria.transactionType || 'all'}`)}
      </h1>
      <div className="flex items-center gap-2.5 border-b border-home-card-border bg-home-panel px-4 py-3">
        <button
          aria-label={t('accessibility.goBack')}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-home-card-border bg-home-section text-home-heading outline-none transition-colors duration-fast ease-standard focus-visible:ring-3 focus-visible:ring-focus/35 motion-reduce:transition-none"
          onClick={() =>
            window.history.length > 1 ? navigate(-1) : navigate('/')
          }
          type="button"
        >
          <ChevronLeft
            aria-hidden="true"
            className="rtl:-scale-x-100"
            size={16}
          />
        </button>

        <button
          aria-controls="mobile-result-filters"
          aria-label={t('results.editSearch')}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-home-card-border bg-home-section px-3.5 py-2.5 text-start outline-none transition-colors duration-fast ease-standard focus-visible:ring-3 focus-visible:ring-focus/35 motion-reduce:transition-none"
          onClick={onOpenFilters}
          type="button"
        >
          <Search
            aria-hidden="true"
            className="shrink-0 text-home-muted"
            size={16}
          />
          <span
            className={`min-w-0 truncate text-[13px] ${
              summary ? 'text-home-heading' : 'text-home-muted'
            }`}
          >
            {summary || t('results.searchPlaceholder')}
          </span>
        </button>

        <button
          aria-controls="mobile-result-filters"
          aria-label={
            activeFilterCount > 0
              ? `${t('results.filters')}. ${t('results.activeFilters', {
                  count: activeFilterCount,
                })}`
              : t('results.filters')
          }
          className="relative inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-home-gold text-home-on-gold outline-none transition-colors duration-fast ease-standard focus-visible:ring-3 focus-visible:ring-focus/35 motion-reduce:transition-none"
          onClick={onOpenFilters}
          type="button"
        >
          <SlidersHorizontal aria-hidden="true" size={16} />
          {activeFilterCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute -end-1 -top-1 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-home-band px-1 text-[10px] font-bold leading-none text-home-band-text"
            >
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 border-b border-home-card-border bg-home-section px-4 py-3">
        <p
          aria-live="polite"
          className="text-[12.5px] font-bold text-home-heading"
        >
          {t('results.count', { count: total })}
        </p>

        <div className="relative shrink-0">
          <label className="sr-only" htmlFor="result-sort-mobile">
            {t('results.sortBy')}
          </label>
          <span
            aria-hidden="true"
            className="flex items-center gap-1.5 text-xs font-medium text-home-muted"
          >
            {t('results.sortValue', { value: t(activeSort.shortLabelKey) })}
            <ChevronDown className="shrink-0" size={12} strokeWidth={2.4} />
          </span>
          <select
            className="absolute inset-0 size-full cursor-pointer appearance-none opacity-0"
            id="result-sort-mobile"
            name="sort"
            onChange={(event) => onSortChange({ sort: event.target.value })}
            value={criteria.sort}
          >
            {availableSortOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
