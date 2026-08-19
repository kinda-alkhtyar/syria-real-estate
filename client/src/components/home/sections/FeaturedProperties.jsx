import Button from '../../ui/Button.jsx'
import Container from '../../ui/Container.jsx'
import { toPropertyCardModel } from '../../../features/properties/adapters/to-property-card-model.js'
import { propertyCatalog } from '../../../features/properties/catalog/property-catalog.js'
import PropertyCard from '../../../features/properties/components/PropertyCard.jsx'
import PropertyCardSkeleton from '../../../features/properties/components/PropertyCardSkeleton.jsx'
import { useProperties } from '../../../features/properties/hooks/useProperties.js'
import {
  featuredLimit,
  selectFeaturedProperties,
} from '../../../features/properties/utils/select-featured-properties.js'
import { useLocale } from '../../../hooks/useLocale.js'
import SectionTitle from '../ui/SectionTitle.jsx'

// One full row of placeholders: the cap is what may arrive, not what is
// promised, so a loading state that reserved eight would mostly overstate.
const skeletonCount = 4

/**
 * Presents a curated, responsive sample of property listings.
 */
export default function FeaturedProperties() {
  const { locale, t } = useLocale()
  const { properties, status } = useProperties()
  const source = status === 'error' ? propertyCatalog : properties
  const cards = selectFeaturedProperties(source, featuredLimit).map((listing) =>
    toPropertyCardModel(listing, locale.code, t),
  )

  return (
    <section
      aria-labelledby="featured-properties-title"
      className="bg-canvas py-14 sm:py-18 xl:py-0 xl:pt-[80px]! xl:pb-[110px]!"
      id="featured"
    >
      <Container className="xl:w-[min(1280px,calc(100%-160px))]! xl:px-0!">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center md:w-full lg:rtl:[direction:rtl]">
          <SectionTitle
            title={t('featured.title')}
            titleClassName="xl:text-[36px]! xl:font-semibold! xl:leading-[48px]! xl:tracking-normal xl:text-home-heading!"
            titleId="featured-properties-title"
          />
          <Button className="px-0" href="#property-search" variant="quiet">
            {t('actions.viewAllProperties')}
          </Button>
        </div>

        {status === 'loading' ? (
          <div
            aria-label={t('results.loading')}
            className="mt-10 grid gap-6 md:grid-cols-2 md:[&>*:nth-child(3):last-child]:col-span-2 md:[&>*:nth-child(3):last-child]:w-[calc(50%-0.75rem)] md:[&>*:nth-child(3):last-child]:justify-self-center xl:mt-[92px]! xl:grid-cols-4! xl:gap-[20px]! xl:[&>*:nth-child(3):last-child]:col-span-1 xl:[&>*:nth-child(3):last-child]:w-auto xl:[&>*:nth-child(3):last-child]:justify-self-stretch"
            role="status"
          >
            {Array.from({ length: skeletonCount }, (unusedValue, index) => (
              <PropertyCardSkeleton key={index} />
            ))}
          </div>
        ) : (
          <>
            {status === 'error' && (
              <p aria-live="polite" className="mt-8 text-sm text-muted">
                {t('results.states.error.description')}
              </p>
            )}
            {cards.length > 0 ? (
              <div className="mt-10 grid gap-6 md:grid-cols-2 md:[&>*:nth-child(3):last-child]:col-span-2 md:[&>*:nth-child(3):last-child]:w-[calc(50%-0.75rem)] md:[&>*:nth-child(3):last-child]:justify-self-center xl:mt-[92px]! xl:grid-cols-4! xl:gap-[20px]! xl:[&>*:nth-child(3):last-child]:col-span-1 xl:[&>*:nth-child(3):last-child]:w-auto xl:[&>*:nth-child(3):last-child]:justify-self-stretch">
                {cards.map((card) => (
                  <PropertyCard key={card.id} showcase {...card} />
                ))}
              </div>
            ) : (
              <p aria-live="polite" className="mt-10 text-muted">
                {t('results.states.empty.description')}
              </p>
            )}
          </>
        )}
      </Container>
    </section>
  )
}
