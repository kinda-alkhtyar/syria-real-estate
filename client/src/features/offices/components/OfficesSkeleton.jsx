import { useLocale } from '../../../hooks/useLocale.js'

function OfficeCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex gap-4 rounded-2xl border border-line bg-elevated p-4 sm:p-5"
    >
      <div className="size-14 shrink-0 animate-pulse rounded-xl bg-skeleton motion-reduce:animate-none sm:size-16" />
      <div className="flex-1 animate-pulse motion-reduce:animate-none">
        <div className="h-5 w-4/5 rounded bg-skeleton" />
        <div className="mt-3 h-4 w-2/5 rounded bg-skeleton" />
        <div className="mt-4 h-6 w-24 rounded-full bg-skeleton" />
      </div>
    </div>
  )
}

/**
 * Reserves the office grid geometry while the first page loads.
 *
 * @param {object} props
 * @param {number} [props.count]
 */
export default function OfficesSkeleton({ count = 6 }) {
  const { t } = useLocale()

  return (
    <div
      aria-busy="true"
      className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3"
      role="status"
    >
      <span className="sr-only">{t('offices.loading')}</span>
      {Array.from({ length: count }, (_, index) => (
        <OfficeCardSkeleton key={index} />
      ))}
    </div>
  )
}
