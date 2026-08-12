import PropertyCardSkeleton from '../../properties/components/PropertyCardSkeleton.jsx'
import { useLocale } from '../../../hooks/useLocale.js'

/**
 * Reserves the office header and the listing grid below it while the detail
 * request is in flight.
 */
export default function OfficeDetailsSkeleton() {
  const { t } = useLocale()

  return (
    <div aria-busy="true" role="status">
      <span className="sr-only">{t('offices.details.loading')}</span>
      <div
        aria-hidden="true"
        className="animate-pulse rounded-2xl border border-line bg-elevated p-5 motion-reduce:animate-none sm:p-6"
      >
        <div className="flex gap-4 sm:gap-5">
          <div className="size-20 shrink-0 rounded-2xl bg-skeleton sm:size-24" />
          <div className="min-w-0 flex-1">
            <div className="h-7 w-3/5 rounded bg-skeleton" />
            <div className="mt-3 h-4 w-2/5 rounded bg-skeleton" />
            <div className="mt-4 h-6 w-28 rounded-full bg-skeleton" />
          </div>
        </div>
        <div className="mt-5 h-4 w-full rounded bg-skeleton" />
        <div className="mt-2 h-4 w-4/5 rounded bg-skeleton" />
        <div className="mt-5 flex gap-2">
          <div className="h-12 w-40 rounded-xl bg-skeleton" />
          <div className="h-12 w-12 rounded-xl bg-skeleton" />
        </div>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <PropertyCardSkeleton
            key={index}
            label={t('accessibility.loadingProperty')}
          />
        ))}
      </div>
    </div>
  )
}
