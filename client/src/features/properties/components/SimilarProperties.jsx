import { toPropertyCardModel } from '../adapters/to-property-card-model.js'
import PropertyCard from './PropertyCard.jsx'
import { useLocale } from '../../../hooks/useLocale.js'

export default function SimilarProperties({ listings }) {
  const { locale, t } = useLocale()
  if (listings.length === 0) return null

  const cards = listings.map((listing) =>
    toPropertyCardModel(listing, locale.code, t),
  )

  return (
    <section aria-labelledby="similar-properties-title" className="mt-16">
      <h2 className="text-2xl font-semibold" id="similar-properties-title">
        {t('propertyDetails.similar')}
      </h2>
      <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <PropertyCard key={card.id} {...card} />
        ))}
      </div>
    </section>
  )
}
