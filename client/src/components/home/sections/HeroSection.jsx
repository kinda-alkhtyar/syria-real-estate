import PropertySearch from '../../../features/property-search/components/PropertySearch.jsx'
import { propertyCatalog } from '../../../features/properties/catalog/property-catalog.js'
import { useProperties } from '../../../features/properties/hooks/useProperties.js'
import { useLocale } from '../../../hooks/useLocale.js'
import Button from '../../ui/Button.jsx'
import Container from '../../ui/Container.jsx'

/**
 * Presents the homepage's primary value proposition and search entry point.
 */
export default function HeroSection() {
  const { t } = useLocale()
  const { properties } = useProperties()
  const heroTitleLines = t('hero.title').split('\n')
  const heroProperty = properties.find(
    (property) => property.id === 'damascus-courtyard',
  ) ?? propertyCatalog.find(
    (property) => property.id === 'damascus-courtyard',
  )

  return (
    <section
      aria-labelledby="hero-title"
      className="relative overflow-hidden bg-canvas pb-14 pt-8 desktop:min-h-[720px] desktop:pb-0 desktop:pt-0"
      id="search"
    >
      <Container className="desktop:w-[min(1280px,calc(100%-160px))]! desktop:px-0!">
        <div className="relative grid gap-[40px] desktop:min-h-[720px] desktop:grid-cols-[720px_520px] desktop:items-start desktop:[direction:ltr]">
          <div className="order-1 desktop:col-start-1 desktop:pt-[40px]">
            <figure
              aria-label={t('hero.sidebarLabel')}
              className="aspect-[36/25] overflow-hidden rounded-[24px] bg-skeleton lg:max-h-[52vw] desktop:aspect-auto desktop:h-[500px] desktop:max-h-none"
            >
              <img
                alt={heroProperty.image.alt ?? t(heroProperty.image.altKey)}
                className="h-full w-full object-cover"
                decoding="async"
                fetchPriority="high"
                height={heroProperty.image.height}
                src={heroProperty.image.src}
                width={heroProperty.image.width}
              />
            </figure>
          </div>

          <div className="order-2 min-w-0 text-start desktop:col-start-2 desktop:pt-[80px] desktop:rtl:[direction:rtl]">
            <p className="text-[18px] font-medium leading-[26px] text-home-gold">
              {t('hero.badge')}
            </p>
            <h1
              className="mt-[22px] whitespace-pre-line break-words text-[32px] font-semibold leading-[42px] text-home-heading [font-family:var(--font-sans)] sm:text-[42px] sm:leading-[54px] lg:text-[48px] lg:leading-[60px] desktop:min-h-[136px] desktop:w-[520px] desktop:text-start desktop:text-[54px] desktop:leading-[68px]"
              id="hero-title"
            >
              {heroTitleLines.map((line, index) => (
                <span className={index === 0 ? 'block' : 'mt-[8px] block'} key={line}>
                  {line}
                </span>
              ))}
            </h1>
            <p className="mt-[21px] max-w-[480px] text-[20px] font-normal leading-[32px] text-home-body desktop:w-[480px] desktop:ltr:w-[520px] desktop:ltr:max-w-[520px] desktop:ltr:text-[18px] desktop:ltr:leading-[28px]">
              {t('hero.description')}
            </p>
            <div className="mt-[18px] flex flex-wrap items-center justify-start gap-4">
              <Button
                className="h-[52px]! min-h-[52px]! w-[155px]! [&:lang(de)]:w-auto! [&:lang(de)]:min-w-[155px]! shrink-0 whitespace-nowrap rounded-[12px]! bg-home-button! px-[10px]! text-[18px]! font-medium! leading-[32px]! text-home-button-text! shadow-none!"
                href="#property-search"
              >
                {t('actions.exploreProperties')}
              </Button>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-8 desktop:absolute desktop:left-1/2 desktop:top-[470px] desktop:mt-0 desktop:h-[176px] desktop:w-[1120px] desktop:-translate-x-1/2">
          <PropertySearch />
        </div>
      </Container>
    </section>
  )
}
