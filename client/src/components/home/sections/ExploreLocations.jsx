import { ArrowUpRight } from 'lucide-react'

import aleppoVilla from '../../../assets/properties/aleppo-villa.jpg'
import damascusCourtyard from '../../../assets/properties/damascus-courtyard.jpg'
import latakiaApartment from '../../../assets/properties/latakia-apartment.jpg'
import { syrianGovernorates } from '../../../constants/syrian-governorates.js'
import { propertyCatalog } from '../../../features/properties/catalog/property-catalog.js'
import { useProperties } from '../../../features/properties/hooks/useProperties.js'
import { useLocale } from '../../../hooks/useLocale.js'
import Container from '../../ui/Container.jsx'
import SectionTitle from '../ui/SectionTitle.jsx'

/**
 * The cities the section promotes, each with the bundled cover it falls back
 * to. A city is an entry point into the catalogue rather than a listing, so it
 * is shown whether or not anything is published there yet; a real listing in
 * that governorate supplies the cover when one exists.
 */
const featuredCities = [
  { cover: damascusCourtyard, governorateId: 'damascus' },
  { cover: aleppoVilla, governorateId: 'aleppo' },
  { cover: latakiaApartment, governorateId: 'latakia' },
]

const coverDimensions = { width: 960, height: 720 }

function cityCards(source, t) {
  return featuredCities
    .map(({ cover, governorateId }) => {
      const governorate = syrianGovernorates.find(
        (option) => option.id === governorateId,
      )
      if (!governorate) return null

      const listing = source.find(
        (property) => property.governorate === governorateId,
      )
      const label = t(governorate.labelKey)
      const listingAlt =
        listing?.image?.alt ??
        (listing?.image?.altKey ? t(listing.image.altKey) : undefined)

      return {
        href: `/properties?governorate=${governorate.id}`,
        id: governorate.id,
        image: listing?.image?.src
          ? { ...coverDimensions, ...listing.image }
          : { ...coverDimensions, src: cover },
        imageAlt: listingAlt || t('locations.cardImageAlt', { city: label }),
        label,
      }
    })
    .filter(Boolean)
}

export default function ExploreLocations() {
  const { t } = useLocale()
  const { properties, status } = useProperties()
  const source = status === 'ready' ? properties : propertyCatalog
  const locations = cityCards(source, t)

  return (
    <section
      aria-labelledby="locations-title"
      className="bg-home-section py-14 sm:py-18 xl:py-0 xl:pt-[72px]! xl:pb-[79px]!"
      id="locations"
    >
      <Container className="xl:w-[min(1280px,calc(100%-160px))]! xl:px-0!">
        <SectionTitle
          className="xl:space-y-[8px]!"
          description={t('locations.description')}
          descriptionClassName="[font-family:var(--font-display)] xl:max-w-[600px]! xl:text-[17px]! xl:font-bold! xl:leading-[30px]! xl:text-home-muted!"
          title={t('locations.title')}
          titleClassName="xl:max-w-[600px]! xl:text-[36px]! xl:font-bold! xl:leading-[48px]! xl:tracking-normal xl:text-home-heading!"
          titleId="locations-title"
        />

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:gap-6 lg:rtl:[direction:rtl] xl:mt-[44px]! xl:grid-cols-3! xl:gap-[40px]!">
          {locations.map(({ href, id, image, imageAlt, label }) => (
            <a
              className="group relative aspect-[5/4] overflow-hidden rounded-[20px] bg-skeleton shadow-[var(--shadow-sm)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus md:last:odd:col-span-2 md:last:odd:justify-self-center md:last:odd:w-[calc(50%-0.75rem)] xl:aspect-[4/3]! xl:last:odd:col-span-1 xl:last:odd:w-auto xl:last:odd:justify-self-stretch"
              href={href}
              key={id}
            >
              <img
                alt={imageAlt}
                className="absolute inset-0 size-full object-cover transition-transform duration-slow group-hover:scale-[1.035] motion-reduce:transform-none motion-reduce:transition-none"
                decoding="async"
                height={image.height}
                loading="lazy"
                src={image.src}
                width={image.width}
              />
              <span
                aria-hidden="true"
                className="absolute inset-0 bg-[rgba(18,36,59,0.38)] transition-opacity duration-standard group-hover:opacity-80 motion-reduce:transition-none"
              />
              <span className="absolute bottom-6 start-6 flex items-end justify-between gap-4 text-white xl:bottom-[34px]! xl:start-[40px]! xl:end-[40px]!">
                <span className="flex flex-col">
                  <span className="text-2xl font-semibold tracking-[-0.025em] xl:text-[32px]! xl:leading-[48px]! xl:tracking-normal">
                    {label}
                  </span>
                  <span className="mt-[2px] text-sm font-semibold text-white/85 xl:text-[16px]! xl:leading-[28px]!">
                    {t('locations.cardAction')}
                  </span>
                </span>
                <ArrowUpRight
                  aria-hidden="true"
                  className="shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5 motion-reduce:transition-none xl:hidden"
                  size={20}
                />
              </span>
            </a>
          ))}
        </div>
      </Container>
    </section>
  )
}
