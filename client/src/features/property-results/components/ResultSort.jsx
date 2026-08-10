import SelectField from '../../../components/ui/SelectField.jsx'
import { useLocale } from '../../../hooks/useLocale.js'
import { resultSortOptions } from '../constants/result-options.js'

/**
 * @param {object} props
 * @param {boolean} [props.compact] Renders the inline phone dropdown that sits
 *   in the results header row instead of the labelled desktop field.
 */
export default function ResultSort({
  compact = false,
  onChange,
  transactionType,
  value,
}) {
  const { t } = useLocale()
  const availableOptions = transactionType
    ? resultSortOptions
    : resultSortOptions.filter((option) => option.id === 'newest')

  if (compact) {
    return (
      <div className="shrink-0">
        <label className="sr-only" htmlFor="result-sort-compact">
          {t('results.sortBy')}
        </label>
        <select
          className="h-11 w-36 rounded-full border border-line bg-surface px-3 text-xs font-semibold text-ink outline-none transition-colors duration-fast ease-standard focus-visible:ring-3 focus-visible:ring-focus/35 motion-reduce:transition-none"
          id="result-sort-compact"
          name="sort"
          onChange={(event) => onChange({ sort: event.target.value })}
          value={value}
        >
          {availableOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {t(option.shortLabelKey)}
            </option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <SelectField
      className="w-full sm:w-56"
      id="result-sort"
      label={t('results.sortBy')}
      name="sort"
      onChange={(event) => onChange({ sort: event.target.value })}
      value={value}
    >
      {availableOptions.map((option) => (
        <option key={option.id} value={option.id}>
          {t(option.labelKey)}
        </option>
      ))}
    </SelectField>
  )
}
