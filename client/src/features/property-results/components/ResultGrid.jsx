import PropertyCard from '../../properties/components/PropertyCard.jsx'
import PartialDataNotice from './PartialDataNotice.jsx'
import ResultPagination from './ResultPagination.jsx'
import ResultRowCard from './ResultRowCard.jsx'
import ResultState from './ResultState.jsx'
import ResultsSkeleton from './ResultsSkeleton.jsx'

export default function ResultGrid({
  cards,
  hasPartialData,
  onClear,
  onPageChange,
  onRetry,
  page,
  pageCount,
  status,
  total,
}) {
  if (status === 'loading') return <ResultsSkeleton />
  if (status === 'error') {
    return <ResultState onAction={onRetry} type="error" />
  }
  if (status === 'empty') return <ResultState type="empty" />
  if (total === 0) {
    return <ResultState onAction={onClear} type="noResults" />
  }

  return (
    <>
      {hasPartialData && <PartialDataNotice />}
      {/* Phones list full-width rows (screen 2a); desktop keeps the card grid. */}
      <ul className="flex flex-col gap-3 lg:hidden" id="property-results-rows">
        {cards.map((card) => (
          <li key={card.id}>
            <ResultRowCard card={card} />
          </li>
        ))}
      </ul>
      <div
        className="hidden grid-cols-2 gap-3 md:gap-6 lg:grid xl:grid-cols-3"
        id="property-results-grid"
      >
        {cards.map((card) => (
          <PropertyCard key={card.id} {...card} />
        ))}
      </div>
      <ResultPagination
        onChange={onPageChange}
        page={page}
        pageCount={pageCount}
      />
    </>
  )
}
