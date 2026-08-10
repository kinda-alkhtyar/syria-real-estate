import { syrianGovernorates } from '../../../constants/syrian-governorates.js'
import { useLocale } from '../../../hooks/useLocale.js'
import DropdownField from '../../../components/ui/DropdownField.jsx'
import SelectField from '../../../components/ui/SelectField.jsx'
import { propertyTypes } from '../../property-search/constants/property-types.js'
import { transactionTypes } from '../../property-search/constants/search-options.js'
import Button from '../../../components/ui/Button.jsx'
import {
  listingStatuses,
  numericFilterConstraints,
} from '../constants/filter-options.js'

function NumericField({ id, label, name, onChange, value, ...props }) {
  return (
    <label className="block min-w-0" htmlFor={id}>
      <span className="mb-1.5 block whitespace-nowrap text-xs font-semibold uppercase tracking-[0.12em] text-muted [&:lang(ar)]:tracking-normal [&:lang(de)]:tracking-normal">
        {label}
      </span>
      <input
        className="min-h-12 w-full min-w-0 rounded-xl border border-input-line bg-input px-3 text-sm outline-none focus:border-focus focus:ring-3 focus:ring-focus/20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        id={id}
        inputMode="numeric"
        name={name}
        onChange={onChange}
        type="number"
        value={value}
        {...props}
      />
    </label>
  )
}

/**
 * Reusable controlled filters for both the desktop sidebar and mobile drawer.
 */
export default function ResultFilters({
  criteria,
  idPrefix,
  onApply,
  onClear,
  onDraftChange,
}) {
  const { t } = useLocale()

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault()
        onApply()
      }}
      onReset={(event) => {
        event.preventDefault()
        onClear()
      }}
    >
      <DropdownField
        id={`${idPrefix}-transaction`}
        label={t('search.transactionType')}
        name="transactionType"
        onChange={(nextValue) => onDraftChange({ transactionType: nextValue })}
        options={[
          { label: t('results.allTransactions'), value: '' },
          ...transactionTypes.map((option) => ({
            label: t(option.labelKey),
            value: option.id,
          })),
        ]}
        value={criteria.transactionType}
      />

      <DropdownField
        id={`${idPrefix}-property-type`}
        label={t('search.propertyType')}
        name="propertyType"
        onChange={(nextValue) => onDraftChange({ propertyType: nextValue })}
        options={[
          { label: t('search.allProperties'), value: '' },
          ...propertyTypes.map((option) => ({
            label: t(option.labelKey),
            value: option.id,
          })),
        ]}
        value={criteria.propertyType}
      />

      <DropdownField
        id={`${idPrefix}-governorate`}
        label={t('search.governorate')}
        name="governorate"
        onChange={(nextValue) => onDraftChange({ governorate: nextValue })}
        options={[
          { label: t('search.allGovernorate'), value: '' },
          ...syrianGovernorates.map((option) => ({
            label: t(option.labelKey),
            value: option.id,
          })),
        ]}
        value={criteria.governorate}
      />

      <fieldset>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted [&:lang(ar)]:tracking-normal">
          {t('results.priceRange')}
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <NumericField
            id={`${idPrefix}-min-price`}
            label={t('results.minimum')}
            name="minPrice"
            onChange={(event) =>
              onDraftChange({ minPrice: event.target.value })
            }
            value={criteria.minPrice}
            {...numericFilterConstraints.price}
          />
          <NumericField
            id={`${idPrefix}-max-price`}
            label={t('results.maximum')}
            name="maxPrice"
            onChange={(event) =>
              onDraftChange({ maxPrice: event.target.value })
            }
            value={criteria.maxPrice}
            {...numericFilterConstraints.price}
          />
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <NumericField
          id={`${idPrefix}-bedrooms`}
          label={t('propertyFacts.bedrooms')}
          name="bedrooms"
          onChange={(event) =>
            onDraftChange({ bedrooms: event.target.value })
          }
          value={criteria.bedrooms}
          {...numericFilterConstraints.bedrooms}
        />
        <NumericField
          id={`${idPrefix}-bathrooms`}
          label={t('propertyFacts.bathrooms')}
          name="bathrooms"
          onChange={(event) =>
            onDraftChange({ bathrooms: event.target.value })
          }
          value={criteria.bathrooms}
          {...numericFilterConstraints.bathrooms}
        />
      </div>

      <fieldset>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted [&:lang(ar)]:tracking-normal">
          {t('results.areaRange')}
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <NumericField
            id={`${idPrefix}-min-area`}
            label={t('results.minimum')}
            name="minArea"
            onChange={(event) =>
              onDraftChange({ minArea: event.target.value })
            }
            value={criteria.minArea}
            {...numericFilterConstraints.area}
          />
          <NumericField
            id={`${idPrefix}-max-area`}
            label={t('results.maximum')}
            name="maxArea"
            onChange={(event) =>
              onDraftChange({ maxArea: event.target.value })
            }
            value={criteria.maxArea}
            {...numericFilterConstraints.area}
          />
        </div>
      </fieldset>

      <SelectField
        id={`${idPrefix}-status`}
        label={t('results.listingStatus')}
        name="status"
        onChange={(event) => onDraftChange({ status: event.target.value })}
        value={criteria.status}
      >
        <option value="">{t('results.allStatuses')}</option>
        {listingStatuses.map((option) => (
          <option key={option.id} value={option.id}>
            {t(option.labelKey)}
          </option>
        ))}
      </SelectField>

      <div className="grid grid-cols-2 gap-3 border-t border-line pt-5">
        <Button className="px-2!" type="reset" variant="secondary">
          {t('actions.clearFilters')}
        </Button>
        <Button className="px-2!" type="submit">
          {t('actions.applyFilters')}
        </Button>
      </div>
    </form>
  )
}
