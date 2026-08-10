import { ArrowUpRight } from 'lucide-react'

import { syrianGovernorates } from '../../../constants/syrian-governorates.js'
import { propertyCatalog } from '../../../features/properties/catalog/property-catalog.js'
import { useProperties } from '../../../features/properties/hooks/useProperties.js'
import { useLocale } from '../../../hooks/useLocale.js'
import Container from '../../ui/Container.jsx'
import SectionTitle from '../ui/SectionTitle.jsx'

const featuredGovernorateIds = ['damascus', 'aleppo', 'latakia']

export default function ExploreLocations() {
  const { t } = useLocale()
  const { properties, status } = useProperties()
  const source = status === 'ready' ? properties : propertyCatalog
  const locations = featuredGovernorateIds
    .map((governorateId) => {
      const governorate = syrianGovernorates.find(
        (option) => option.id === governorateId,
      )
      const listing = source.find(
        (property) => property.governorate === governorateId,
      )

      return governorate && listing ? { governorate, listing } : null
    })
    .filter(Boolean)

  return (
    <section
      aria-labelledby="locations-title"
      className="bg-home-section py-14 sm:py-18 xl:min-h-[1202px]! xl:py-0 xl:pt-[72px]! xl:pb-[79px]!"
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

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:gap-6 lg:rtl:[direction:rtl] xl:mt-[44px]! xl:grid-cols-[repeat(2,620px)]! xl:justify-start xl:gap-x-[40px]! xl:gap-y-[33px]!">
          {locations.slice(0, 2).map(({ governorate, listing }) => (
            <a
              className="group relative aspect-[5/4] overflow-hidden rounded-[20px] bg-skeleton shadow-[var(--shadow-sm)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus xl:aspect-auto! xl:h-[420px]! xl:w-[620px]!"
              href={`/properties?governorate=${governorate.id}`}
              key={governorate.id}
            >
              <img
                alt={listing.image.alt ?? t(listing.image.altKey)}
                className="absolute inset-0 size-full object-cover transition-transform duration-slow group-hover:scale-[1.035] motion-reduce:transform-none motion-reduce:transition-none"
                decoding="async"
                height={listing.image.height}
                loading="lazy"
                src={listing.image.src}
                width={listing.image.width}
              />
              <span
                aria-hidden="true"
                className="absolute inset-0 bg-[rgba(18,36,59,0.38)] transition-opacity duration-standard group-hover:opacity-80 motion-reduce:transition-none"
              />
              <span className="absolute bottom-6 start-6 flex items-end justify-between gap-4 text-white xl:bottom-[34px]! xl:start-[40px]! xl:end-[40px]!">
                <span className="flex flex-col">
                  <span className="text-2xl font-semibold tracking-[-0.025em] xl:text-[32px]! xl:leading-[48px]! xl:tracking-normal">
                    {t(governorate.labelKey)}
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

          {locations[2] && (
            <div className="md:col-span-2 flex justify-center">
              <a
                className="group relative aspect-[5/4] w-full max-w-[36rem] overflow-hidden rounded-[20px] bg-skeleton shadow-[var(--shadow-sm)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus xl:aspect-auto! xl:h-[420px]! xl:w-[620px]! xl:max-w-none!"
                href={`/properties?governorate=${locations[2].governorate.id}`}
              >
                <img
                  alt={locations[2].listing.image.alt ?? t(locations[2].listing.image.altKey)}
                  className="absolute inset-0 size-full object-cover transition-transform duration-slow group-hover:scale-[1.035] motion-reduce:transform-none motion-reduce:transition-none"
                  decoding="async"
                  height={locations[2].listing.image.height}
                  loading="lazy"
                  src={locations[2].listing.image.src}
                  width={locations[2].listing.image.width}
                />
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-[rgba(18,36,59,0.38)] transition-opacity duration-standard group-hover:opacity-80 motion-reduce:transition-none"
                />
                <span className="absolute bottom-6 start-6 flex items-end justify-between gap-4 text-white xl:bottom-[34px]! xl:start-[40px]! xl:end-[40px]!">
                  <span className="flex flex-col">
                    <span className="text-2xl font-semibold tracking-[-0.025em] xl:text-[32px]! xl:leading-[48px]! xl:tracking-normal">
                      {t(locations[2].governorate.labelKey)}
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
            </div>
          )}
        </div>
      </Container>
    </section>
  )
}
