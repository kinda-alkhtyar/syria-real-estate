import { SlidersHorizontal } from 'lucide-react'

import { propertyTypes } from '../../property-search/constants/property-types.js'
import { transactionTypes } from '../../property-search/constants/search-options.js'
import { useLocale } from '../../../hooks/useLocale.js'

/**
 * Sticky one-tap filters for phones and portrait tablets.
 *
 * Each chip writes an existing result criterion, so the URL contract and the
 * full filter drawer stay authoritative. Hidden from `lg` upwards, where the
 * permanent sidebar already exposes every filter.
 */
export default function ResultQuickChips({
  activeFilterCount,
  criteria,
  onOpenFilters,
  onSelect,
}) {
  const { t } = useLocale()

  /**
   * Flattened into one uniform track so every chip shares the same height,
   * radius, and gap; the group boundaries stay implicit in the ordering.
   * Governorates are deliberately absent — the track stays short enough to
   * scan, and the bottom sheet owns location as a full picker.
   */
  const chips = [
    ...transactionTypes.map(({ id, labelKey }) => ({
      criterion: 'transactionType',
      id,
      labelKey,
    })),
    ...propertyTypes.map(({ id, labelKey }) => ({
      criterion: 'propertyType',
      id,
      labelKey,
    })),
  ]

  return (
    <div className="sticky top-16 z-10 -mx-4 mb-4 border-b border-line bg-canvas/95 px-4 py-2.5 backdrop-blur-sm sm:-mx-6 sm:px-6 lg:hidden">
      <div className="flex items-center gap-2">
        <button
          aria-controls="mobile-result-filters"
          aria-label={
            activeFilterCount > 0
              ? `${t('results.filters')}. ${t('results.activeFilters', {
                  count: activeFilterCount,
                })}`
              : t('results.filters')
          }
          className="relative inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink outline-none transition-colors duration-fast ease-standard focus-visible:ring-3 focus-visible:ring-focus/35 motion-reduce:transition-none"
          onClick={onOpenFilters}
          type="button"
        >
          <SlidersHorizontal aria-hidden="true" size={18} />
          {activeFilterCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute -end-1 -top-1 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-home-gold px-1 text-[10px] font-bold leading-none text-home-on-gold"
            >
              {activeFilterCount}
            </span>
          )}
        </button>

        <div
          aria-label={t('accessibility.quickFilters')}
          className="-my-1 flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="group"
        >
          {chips.map((chip) => {
            const isActive = criteria[chip.criterion] === chip.id

            return (
              <button
                aria-pressed={isActive}
                className={`inline-flex h-11 shrink-0 items-center whitespace-nowrap rounded-full border px-4 text-sm font-semibold outline-none transition-colors duration-fast ease-standard focus-visible:ring-3 focus-visible:ring-focus/35 motion-reduce:transition-none ${
                  isActive
                    ? 'border-transparent bg-home-gold text-home-on-gold'
                    : 'border-line bg-surface text-ink'
                }`}
                key={`${chip.criterion}:${chip.id}`}
                onClick={() =>
                  onSelect({
                    [chip.criterion]: isActive ? '' : chip.id,
                  })
                }
                type="button"
              >
                {t(chip.labelKey)}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
