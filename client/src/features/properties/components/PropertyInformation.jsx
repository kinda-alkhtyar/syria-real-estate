import { useLocale } from '../../../hooks/useLocale.js'
import { formatNumber } from '../utils/property-formatters.js'

export default function PropertyInformation({ information }) {
  const { locale, t } = useLocale()
  if (!information) return null

  const rows = [
    ['reference', information.reference],
    ['yearBuilt', information.yearBuilt],
    ['floors', information.floors],
  ]
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => [
      key,
      typeof value === 'number' ? formatNumber(value, locale.code) : value,
    ])

  if (rows.length === 0) return null

  return (
    <section aria-labelledby="property-information-title">
      <h2 className="text-2xl font-semibold" id="property-information-title">
        {t('propertyDetails.information')}
      </h2>
      <dl className="mt-5 divide-y divide-line rounded-2xl border border-line bg-surface px-5">
        {rows.map(([key, value]) => (
          <div className="flex justify-between gap-5 py-4" key={key}>
            <dt className="text-muted">
              {t(`propertyDetails.informationLabels.${key}`)}
            </dt>
            <dd className="text-end font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
