import { ChevronDown, MapPin } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { syrianGovernorates } from '../../../constants/syrian-governorates.js'
import { useLocale } from '../../../hooks/useLocale.js'
import { propertyTypes } from '../../property-search/constants/property-types.js'
import { transactionTypes } from '../../property-search/constants/search-options.js'

const bedroomOptions = [1, 2, 3, 4]

/**
 * Shared control surface so the typed number fields and the governorate select
 * line up at the same height inside the sheet.
 */
const controlClassName =
  'min-h-12 w-full min-w-0 rounded-[12px] border border-home-card-border bg-home-section px-3.5 text-[13px] text-home-heading outline-none transition duration-fast ease-standard focus:border-focus focus:ring-3 focus:ring-focus/20 motion-reduce:transition-none'

/** The sheet accepts typed digits only — no stepper, no scroll-to-change. */
function toDigits(value) {
  return value.replace(/\D/g, '')
}

function NumericField({ id, label, onChange, value }) {
  return (
    <div className="min-w-0 flex-1">
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <input
        autoComplete="off"
        className={`${controlClassName} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
        id={id}
        inputMode="numeric"
        onChange={(event) => onChange(toDigits(event.target.value))}
        pattern="[0-9]*"
        placeholder={label}
        type="text"
        value={value}
      />
    </div>
  )
}

/** Gold when applied, quiet otherwise — tapping an applied chip clears it. */
function ChoiceChip({ isActive, label, onClick }) {
  return (
    <button
      aria-pressed={isActive}
      className={`inline-flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-full px-4 text-xs font-semibold outline-none transition-colors duration-fast ease-standard focus-visible:ring-3 focus-visible:ring-focus/35 motion-reduce:transition-none ${
        isActive
          ? 'bg-home-gold font-bold text-home-on-gold'
          : 'border border-home-card-border bg-home-section text-home-heading'
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  )
}

function SheetSection({ children, title, titleId }) {
  return (
    <section aria-labelledby={titleId} className="mb-4">
      <h3
        className="mb-2 text-[12.5px] font-bold text-home-heading"
        id={titleId}
      >
        {title}
      </h3>
      {children}
    </section>
  )
}

/**
 * Presents every result filter as a modal bottom sheet on phones and portrait
 * tablets, matching screen 2b of the approved mobile design. Desktop keeps the
 * permanent sidebar, so this surface is `lg:hidden`.
 *
 * The phone screen has no quick-chip track and no active-filter bar: listing
 * type and property type live here, and the header's reset link is the single
 * clear-all control.
 *
 * Numeric criteria are typed rather than stepped, which keeps the sheet usable
 * one-handed and avoids accidental changes while scrolling.
 */
export default function FilterDrawer({
  criteria,
  onApply,
  onClear,
  onClose,
  onDraftChange,
  open,
  returnFocusRef,
  total,
}) {
  const { t } = useLocale()
  const dialogRef = useRef(null)
  const wasOpenRef = useRef(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
    if (!open && wasOpenRef.current) {
      returnFocusRef.current?.focus()
    }
    wasOpenRef.current = open
  }, [open, returnFocusRef])

  // `showModal()` already traps focus and closes on Escape. The page behind a
  // modal dialog still scrolls on iOS, so the lock stays explicit.
  useEffect(() => {
    if (!open) {
      return undefined
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  /** The design has no close icon, so the dimmed backdrop dismisses the sheet. */
  function handleDialogClick(event) {
    if (event.target === dialogRef.current) onClose()
  }

  return (
    <dialog
      aria-labelledby="filter-sheet-title"
      className="m-0 mt-auto max-h-none w-full max-w-none rounded-t-[20px] border-0 bg-home-panel p-0 text-home-heading backdrop:bg-overlay lg:hidden"
      id="mobile-result-filters"
      onCancel={onClose}
      onClick={handleDialogClick}
      onClose={onClose}
      ref={dialogRef}
    >
      <form
        className="flex max-h-[86svh] flex-col"
        onReset={(event) => {
          event.preventDefault()
          onClear()
        }}
        onSubmit={(event) => {
          event.preventDefault()
          onApply()
          onClose()
        }}
      >
        <div className="shrink-0 px-5 pt-2">
          <div
            aria-hidden="true"
            className="mx-auto h-1 w-10 rounded-full bg-home-card-border"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <h2
              className="text-base font-extrabold text-home-heading"
              id="filter-sheet-title"
            >
              {t('results.filters')}
            </h2>
            <button
              className="-me-2 inline-flex min-h-11 items-center px-2 text-[13px] font-semibold text-home-gold outline-none focus-visible:ring-3 focus-visible:ring-focus/35"
              type="reset"
            >
              {t('actions.clearFilters')}
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-2">
          <SheetSection
            title={t('search.governorate')}
            titleId="filter-sheet-location"
          >
            <div className="relative">
              <MapPin
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 start-3.5 my-auto shrink-0 text-home-muted"
                size={15}
              />
              <label className="sr-only" htmlFor="filter-sheet-governorate">
                {t('search.governorate')}
              </label>
              <select
                className={`${controlClassName} appearance-none ps-9 pe-9`}
                id="filter-sheet-governorate"
                name="governorate"
                onChange={(event) =>
                  onDraftChange({ governorate: event.target.value })
                }
                value={criteria.governorate}
              >
                <option value="">{t('search.allGovernorate')}</option>
                {syrianGovernorates.map((option) => (
                  <option key={option.id} value={option.id}>
                    {t(option.labelKey)}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 end-3.5 my-auto shrink-0 text-home-heading"
                size={14}
                strokeWidth={2.2}
              />
            </div>
          </SheetSection>

          <SheetSection
            title={t('search.propertyType')}
            titleId="filter-sheet-type"
          >
            <div className="flex flex-wrap gap-2">
              {propertyTypes.map((option) => {
                const isActive = criteria.propertyType === option.id

                return (
                  <ChoiceChip
                    isActive={isActive}
                    key={option.id}
                    label={t(option.labelKey)}
                    onClick={() =>
                      onDraftChange({ propertyType: isActive ? '' : option.id })
                    }
                  />
                )
              })}
            </div>
          </SheetSection>

          <SheetSection
            title={t('search.transactionType')}
            titleId="filter-sheet-transaction"
          >
            <div
              aria-label={t('search.transactionType')}
              className="flex gap-1 rounded-[12px] bg-home-section p-1"
              role="group"
            >
              {transactionTypes.map((option) => {
                const isActive = criteria.transactionType === option.id

                return (
                  <button
                    aria-pressed={isActive}
                    className={`min-h-10 flex-1 rounded-[9px] px-2 text-center text-[12.5px] outline-none transition-colors duration-fast ease-standard focus-visible:ring-3 focus-visible:ring-focus/35 motion-reduce:transition-none ${
                      isActive
                        ? 'bg-home-band font-bold text-home-band-text'
                        : 'font-semibold text-home-heading'
                    }`}
                    key={option.id}
                    onClick={() =>
                      onDraftChange({
                        transactionType: isActive ? '' : option.id,
                      })
                    }
                    type="button"
                  >
                    {t(option.labelKey)}
                  </button>
                )
              })}
            </div>
          </SheetSection>

          <SheetSection
            title={t('results.priceRange')}
            titleId="filter-sheet-price"
          >
            <div className="flex gap-2.5">
              <NumericField
                id="filter-sheet-min-price"
                label={t('results.minimum')}
                onChange={(nextValue) => onDraftChange({ minPrice: nextValue })}
                value={criteria.minPrice}
              />
              <NumericField
                id="filter-sheet-max-price"
                label={t('results.maximum')}
                onChange={(nextValue) => onDraftChange({ maxPrice: nextValue })}
                value={criteria.maxPrice}
              />
            </div>
          </SheetSection>

          <SheetSection
            title={t('results.areaAndRooms')}
            titleId="filter-sheet-area"
          >
            <div className="mb-2.5 flex gap-2.5">
              <NumericField
                id="filter-sheet-min-area"
                label={t('results.minimum')}
                onChange={(nextValue) => onDraftChange({ minArea: nextValue })}
                value={criteria.minArea}
              />
              <NumericField
                id="filter-sheet-max-area"
                label={t('results.maximum')}
                onChange={(nextValue) => onDraftChange({ maxArea: nextValue })}
                value={criteria.maxArea}
              />
            </div>
            <div
              aria-label={t('propertyFacts.bedrooms')}
              className="flex gap-2"
              role="group"
            >
              {bedroomOptions.map((count) => {
                const isActive = String(criteria.bedrooms) === String(count)

                return (
                  <button
                    aria-pressed={isActive}
                    className={`min-h-10 flex-1 rounded-[10px] text-center text-xs outline-none transition-colors duration-fast ease-standard focus-visible:ring-3 focus-visible:ring-focus/35 motion-reduce:transition-none ${
                      isActive
                        ? 'bg-home-band font-bold text-home-band-text'
                        : 'border border-home-card-border bg-home-section font-semibold text-home-heading'
                    }`}
                    key={count}
                    onClick={() =>
                      onDraftChange({ bedrooms: isActive ? '' : count })
                    }
                    type="button"
                  >
                    {t('results.bedroomsAtLeast', { count })}
                  </button>
                )
              })}
            </div>
          </SheetSection>
        </div>

        <div className="shrink-0 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3">
          <button
            className="min-h-13 w-full rounded-[12px] bg-home-gold text-sm font-extrabold text-home-on-gold outline-none transition-colors duration-fast ease-standard focus-visible:ring-3 focus-visible:ring-focus/35 motion-reduce:transition-none"
            type="submit"
          >
            {t('results.showResults', { count: total })}
          </button>
        </div>
      </form>
    </dialog>
  )
}
