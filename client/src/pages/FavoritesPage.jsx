import { Heart } from 'lucide-react'

import Button from '../components/ui/Button.jsx'
import Container from '../components/ui/Container.jsx'
import { toPropertyCardModel } from '../features/properties/adapters/to-property-card-model.js'
import PropertyCard from '../features/properties/components/PropertyCard.jsx'
import { useProperties } from '../features/properties/hooks/useProperties.js'
import { useFavorites } from '../hooks/useFavorites.js'
import { useLocale } from '../hooks/useLocale.js'

export default function FavoritesPage() {
  const { clearFavorites, favoriteIds } = useFavorites()
  const { locale, t } = useLocale()
  const { properties, status } = useProperties()
  const favoriteProperties = favoriteIds
    .map((propertyId) =>
      properties.find((property) => property.id === propertyId),
    )
    .filter(Boolean)
  const cards = favoriteProperties.map((property) =>
    toPropertyCardModel(property, locale.code, t),
  )

  return (
    <section
      aria-labelledby="favorites-title"
      className="bg-canvas py-10 sm:py-14 lg:py-16"
    >
      <Container>
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <h1
              className="text-3xl font-semibold tracking-[-0.04em] text-ink sm:text-4xl"
              id="favorites-title"
            >
              {t('favorites.title')}
            </h1>
            <p className="mt-4 text-base leading-7 text-muted">
              {t('favorites.description')}
            </p>
            {cards.length > 0 && (
              <p aria-live="polite" className="mt-3 text-sm font-semibold text-secondary">
                {t('favorites.count', { count: cards.length })}
              </p>
            )}
          </div>

          {cards.length > 0 && (
            <Button onClick={clearFavorites} variant="secondary">
              {t('favorites.clearAll')}
            </Button>
          )}
        </div>

        {status === 'loading' ? (
          <p aria-live="polite" className="mt-10 text-muted" role="status">
            {t('results.loading')}
          </p>
        ) : status === 'error' ? (
          <p aria-live="assertive" className="mt-10 text-muted">
            {t('results.states.error.description')}
          </p>
        ) : cards.length > 0 ? (
          <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
            {cards.map((card) => (
              <PropertyCard key={card.id} {...card} />
            ))}
          </div>
        ) : (
          <section className="mt-10 rounded-2xl border border-line bg-surface px-5 py-14 text-center">
            <Heart
              aria-hidden="true"
              className="mx-auto text-accent"
              size={34}
            />
            <h2 className="mt-5 text-2xl font-semibold text-ink">
              {t('favorites.emptyTitle')}
            </h2>
            <p className="mx-auto mt-3 max-w-md leading-7 text-muted">
              {t('favorites.emptyDescription')}
            </p>
            <Button className="mt-6" href="/properties">
              {t('favorites.browseProperties')}
            </Button>
          </section>
        )}
      </Container>
    </section>
  )
}
