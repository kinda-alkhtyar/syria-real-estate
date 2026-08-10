import PropertyCardSkeleton from '../../properties/components/PropertyCardSkeleton.jsx'
import ResultRowSkeleton from './ResultRowSkeleton.jsx'
import { useLocale } from '../../../hooks/useLocale.js'

export default function ResultsSkeleton() {
  const { t } = useLocale()
  const label = t('accessibility.loadingProperty')

  return (
    <div aria-busy="true">
      {/* Mirrors the row list phones actually render (screen 2a). */}
      <div className="flex flex-col gap-3 lg:hidden">
        {Array.from({ length: 6 }, (_, index) => (
          <ResultRowSkeleton key={index} label={label} />
        ))}
      </div>
      <div className="hidden grid-cols-2 gap-3 md:gap-6 lg:grid xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <PropertyCardSkeleton key={index} label={label} />
        ))}
      </div>
    </div>
  )
}
