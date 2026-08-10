import {
  Bath,
  BedDouble,
  ChevronLeft,
  Heart,
  Layers,
  Mail,
  MapPin,
  Maximize2,
  MessageCircle,
  Phone,
  Share2,
} from 'lucide-react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'

import Badge from '../components/home/ui/Badge.jsx'
import Container from '../components/ui/Container.jsx'
import IconButton from '../components/ui/IconButton.jsx'
import PropertyAttributeList from '../features/properties/components/PropertyAttributeList.jsx'
import PropertyContactCard from '../features/properties/components/PropertyContactCard.jsx'
import PropertyDetailsSkeleton from '../features/properties/components/PropertyDetailsSkeleton.jsx'
import PropertyDetailsState from '../features/properties/components/PropertyDetailsState.jsx'
import PropertyGallery from '../features/properties/components/PropertyGallery.jsx'
import PropertyInformation from '../features/properties/components/PropertyInformation.jsx'
import SimilarProperties from '../features/properties/components/SimilarProperties.jsx'
import {
  toCallHref,
  toWhatsappHref,
} from '../features/properties/utils/contact-links.js'
import {
  formatArea,
  formatCurrency,
  formatNumber,
} from '../features/properties/utils/property-formatters.js'
import { selectSimilarProperties } from '../features/properties/utils/select-similar-properties.js'
import { useProperties } from '../features/properties/hooks/useProperties.js'
import { usePropertyDetails } from '../features/properties/hooks/usePropertyDetails.js'
import { useFavorites } from '../hooks/useFavorites.js'
import { useLocale } from '../hooks/useLocale.js'

/**
 * Phone action bar from the approved mobile screen: the outline call button,
 * the green WhatsApp button, then the enquiry action.
 *
 * The two contact buttons only exist when the seller saved a number, so a
 * listing without one keeps the enquiry action on its own rather than showing
 * controls that cannot reach anybody.
 */
function MobileActionBar({ callHref, whatsappHref }) {
  const { t } = useLocale()

  return (
    <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 -mx-4 mt-6 flex gap-2.5 border-t border-home-card-border bg-home-panel px-4 pb-3 pt-3">
      {callHref && (
        <a
          aria-label={t('propertyDetails.callAction')}
          className="inline-flex size-13 shrink-0 items-center justify-center rounded-[14px] border border-home-card-border bg-home-section text-home-heading outline-none transition-colors duration-fast ease-standard focus-visible:ring-3 focus-visible:ring-focus/35 motion-reduce:transition-none"
          href={callHref}
        >
          <Phone aria-hidden="true" size={20} strokeWidth={1.9} />
        </a>
      )}
      {whatsappHref && (
        <a
          aria-label={t('propertyDetails.whatsappAction')}
          className="inline-flex size-13 shrink-0 items-center justify-center rounded-[14px] bg-whatsapp text-on-whatsapp outline-none transition-colors duration-fast ease-standard hover:bg-whatsapp-hover focus-visible:ring-3 focus-visible:ring-focus/35 motion-reduce:transition-none"
          href={whatsappHref}
          rel="noreferrer noopener"
          target="_blank"
        >
          <MessageCircle aria-hidden="true" size={20} strokeWidth={1.9} />
        </a>
      )}
      <button
        aria-disabled="true"
        className="inline-flex min-h-13 flex-1 items-center justify-center gap-2 rounded-[14px] bg-home-band text-sm font-bold text-home-band-text opacity-60"
        disabled
        type="button"
      >
        <Mail aria-hidden="true" size={18} />
        {t('propertyDetails.contactAction')}
      </button>
    </div>
  )
}

export default function PropertyDetailsPage() {
  const { propertyId } = useParams()
  const navigate = useNavigate()
  const routeLocation = useLocation()
  const { isFavorite, toggleFavorite } = useFavorites()
  const { locale, t } = useLocale()
  const { properties } = useProperties()
  const { property, retry, status } = usePropertyDetails(propertyId)

  if (status === 'loading') {
    return <PropertyDetailsSkeleton label={t('propertyDetails.loading')} />
  }
  if (status === 'error') {
    return <PropertyDetailsState onRetry={retry} type="error" />
  }
  if (status === 'notFound') {
    return <PropertyDetailsState type="notFound" />
  }

  const title = property.title
  const favorite = isFavorite(property.id)
  const facts = [
    {
      icon: BedDouble,
      label: t('propertyFacts.bedrooms'),
      rawValue: property.facts?.bedrooms,
      format: (value) => formatNumber(value, locale.code),
    },
    {
      icon: Bath,
      label: t('propertyFacts.bathrooms'),
      rawValue: property.facts?.bathrooms,
      format: (value) => formatNumber(value, locale.code),
    },
    {
      icon: Maximize2,
      label: t('propertyFacts.area'),
      rawValue: property.facts?.areaSquareMeters,
      format: (value) => formatArea(value, locale.code, t),
    },
  ]
    .filter(
      ({ rawValue }) =>
        Number.isFinite(rawValue) && rawValue > 0,
    )
    .map(({ format, rawValue, ...fact }) => ({
      ...fact,
      value: format(rawValue),
    }))
  const similar = selectSimilarProperties(properties, property)
  const requestedReturnPath = routeLocation.state?.from
  const returnPath =
    typeof requestedReturnPath === 'string' &&
    /^\/properties(?:\?|$)/.test(requestedReturnPath)
      ? requestedReturnPath
      : '/properties'

  const priceLabel = `${formatCurrency(
    property.price.amount,
    property.price.currency,
    locale.code,
  )}${property.price.periodKey ? ` ${t(property.price.periodKey)}` : ''}`
  const locationLabel = property.location ?? t(property.locationKey)
  const floors = property.information?.floors
  const favoriteLabel = t(
    favorite
      ? 'accessibility.removeFromFavorites'
      : 'accessibility.addToFavorites',
    { title },
  )
  const callHref = toCallHref(property.whatsapp)
  const whatsappHref = toWhatsappHref(
    property.whatsapp,
    t('propertyDetails.whatsappMessage', { title }),
  )

  async function handleShare() {
    const url = window.location.href

    if (navigator.share) {
      try {
        await navigator.share({ title, url })
      } catch {
        /* The user dismissed the share sheet. */
      }
      return
    }

    await navigator.clipboard?.writeText(url)
  }

  return (
    <>
      {/* Phone and portrait tablet screen from the approved mobile design. */}
      <div className="bg-canvas pb-2 lg:hidden">
        <div className="relative">
          <PropertyGallery
            images={property.images}
            label={t('propertyDetails.gallery')}
          />
          <button
            aria-label={t('propertyDetails.backToResults')}
            className="absolute start-3 top-3 inline-flex size-11 items-center justify-center rounded-full bg-home-panel/90 text-home-heading shadow-sm outline-none backdrop-blur-sm focus-visible:ring-3 focus-visible:ring-focus/35"
            onClick={() => navigate(returnPath)}
            type="button"
          >
            <ChevronLeft
              aria-hidden="true"
              className="rtl:-scale-x-100"
              size={20}
            />
          </button>
          {/* Screen 3a pairs the save and share marks over the gallery. */}
          <div className="absolute end-3 top-3 flex items-center gap-2">
            <button
              aria-label={favoriteLabel}
              aria-pressed={favorite}
              className="favorite-button inline-flex size-11 items-center justify-center rounded-full bg-home-panel/90 text-ink shadow-sm outline-none backdrop-blur-sm focus-visible:ring-3 focus-visible:ring-focus/35"
              data-favorite={favorite}
              onClick={() => toggleFavorite(property.id)}
              type="button"
            >
              <Heart aria-hidden="true" data-favorite-icon size={19} />
            </button>
            <button
              aria-label={t('propertyDetails.share')}
              className="inline-flex size-11 items-center justify-center rounded-full bg-home-panel/90 text-home-heading shadow-sm outline-none backdrop-blur-sm focus-visible:ring-3 focus-visible:ring-focus/35"
              onClick={handleShare}
              type="button"
            >
              <Share2 aria-hidden="true" size={18} />
            </button>
          </div>
        </div>

        <div className="bg-home-panel px-4 pb-5 pt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 truncate text-[22px] font-extrabold leading-8 text-home-gold">
              {priceLabel}
            </p>
            <span className="inline-flex shrink-0 items-center rounded-full border border-home-card-border bg-home-section px-3 py-1 text-[11px] font-bold text-home-heading">
              {t(`transactionTypes.${property.transactionType}`)}
            </span>
          </div>
          <h1 className="mt-1.5 text-base font-bold leading-6 text-home-heading">
            {title}
          </h1>
          <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-home-muted">
            <MapPin aria-hidden="true" className="shrink-0" size={14} />
            <span className="min-w-0">{locationLabel}</span>
          </p>

          {(facts.length > 0 || floors) && (
            <dl className="mt-4 flex flex-wrap gap-2">
              {facts.map(({ icon: Icon, label, value }) => (
                <div
                  className="flex items-center gap-1.5 rounded-[10px] bg-home-section px-3 py-2 text-xs font-semibold text-home-heading"
                  key={label}
                >
                  <Icon aria-hidden="true" className="shrink-0" size={15} />
                  <dt className="sr-only">{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
              {floors && (
                <div className="flex items-center gap-1.5 rounded-[10px] bg-home-section px-3 py-2 text-xs font-semibold text-home-heading">
                  <Layers aria-hidden="true" className="shrink-0" size={15} />
                  <dt className="sr-only">
                    {t('propertyDetails.informationLabels.floors')}
                  </dt>
                  <dd>{formatNumber(floors, locale.code)}</dd>
                </div>
              )}
            </dl>
          )}

          {property.description && (
            <section aria-labelledby="mobile-description-title" className="mt-5">
              <h2
                className="text-[13px] font-bold text-home-heading"
                id="mobile-description-title"
              >
                {t('propertyDetails.description')}
              </h2>
              <p className="mt-2 text-[12.5px] leading-[1.9] text-home-muted">
                {property.description}
              </p>
            </section>
          )}
        </div>

        <div className="px-4">
          <div className="mt-5 space-y-8">
            <PropertyAttributeList
              attributes={
                property.features?.map((key) =>
                  t(`propertyDetails.attributes.${key}`),
                ) ?? []
              }
              title={t('propertyDetails.features')}
              titleId="mobile-features-title"
            />
            <PropertyAttributeList
              attributes={
                property.amenities?.map((key) =>
                  t(`propertyDetails.attributes.${key}`),
                ) ?? []
              }
              title={t('propertyDetails.amenities')}
              titleId="mobile-amenities-title"
            />
            <PropertyInformation information={property.information} />
          </div>
          <MobileActionBar
            callHref={callHref}
            whatsappHref={whatsappHref}
          />
        </div>

        <div className="px-4">
          <SimilarProperties listings={similar} />
        </div>
      </div>

      <div className="hidden lg:block">
        <div className="bg-canvas py-8 sm:py-12">
      <Container>
        <nav aria-label={t('propertyDetails.breadcrumb')}>
          <Link className="text-sm text-muted hover:text-ink" to={returnPath}>
            {t('propertyDetails.backToResults')}
          </Link>
        </nav>

        <div className="mt-6 grid min-w-0 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <article className="min-w-0">
            <PropertyGallery
              images={property.images}
              label={t('propertyDetails.gallery')}
            />

            <header className="mt-8">
              <div className="flex flex-wrap gap-2">
                <Badge>{t(`transactionTypes.${property.transactionType}`)}</Badge>
                <Badge variant="secondary">
                  {t(`propertyTypes.${property.propertyType}`)}
                </Badge>
                <Badge variant="secondary">
                  {t(`listingStatuses.${property.status}`)}
                </Badge>
              </div>
              <div className="mt-4 flex items-start justify-between gap-4">
                <h1 className="min-w-0 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                  {title}
                </h1>
                  <IconButton
                    aria-pressed={favorite}
                    className="favorite-button shrink-0"
                    data-favorite={favorite}
                  label={t(
                    favorite
                      ? 'accessibility.removeFromFavorites'
                      : 'accessibility.addToFavorites',
                    { title },
                  )}
                  onClick={() => toggleFavorite(property.id)}
                >
                    <Heart
                      aria-hidden="true"
                      className="transition-[color,fill,stroke,transform] duration-standard active:scale-95 motion-reduce:transition-none"
                      data-favorite-icon
                      size={20}
                    />
                </IconButton>
              </div>
              <p className="mt-3 flex items-center gap-2 text-muted">
                <MapPin aria-hidden="true" size={18} />
                {property.location ?? t(property.locationKey)}
              </p>
              <p className="mt-5 text-3xl font-bold lg:text-2xl lg:font-semibold">
                {formatCurrency(
                  property.price.amount,
                  property.price.currency,
                  locale.code,
                )}
                {property.price.periodKey
                  ? ` ${t(property.price.periodKey)}`
                  : ''}
              </p>
            </header>

            {facts.length > 0 && (
            <dl className="mt-6 flex flex-wrap gap-2 lg:mt-8 lg:grid lg:grid-cols-3 lg:gap-3">
              {facts.map(({ icon: Icon, label, value }) => (
                <div
                  className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-2 lg:block lg:rounded-xl lg:px-4 lg:py-4 lg:text-center"
                  key={label}
                >
                  <Icon
                    aria-hidden="true"
                    className="shrink-0 text-accent lg:mx-auto"
                  />
                  <dt className="text-xs text-muted lg:mt-2">{label}</dt>
                  <dd className="font-semibold lg:mt-1">{value}</dd>
                </div>
              ))}
            </dl>
            )}

            {property.description && (
            <section aria-labelledby="description-title" className="mt-10">
              <h2 className="text-2xl font-semibold" id="description-title">
                {t('propertyDetails.description')}
              </h2>
              <p className="mt-4 leading-8 text-muted">
                {property.description}
              </p>
            </section>
            )}

            <div className="mt-12 space-y-12">
              <PropertyAttributeList
                attributes={property.features?.map((key) =>
                  t(`propertyDetails.attributes.${key}`),
                ) ?? []}
                title={t('propertyDetails.features')}
                titleId="property-features-title"
              />
              <PropertyAttributeList
                attributes={property.amenities?.map((key) =>
                  t(`propertyDetails.attributes.${key}`),
                ) ?? []}
                title={t('propertyDetails.amenities')}
                titleId="property-amenities-title"
              />
              <PropertyInformation information={property.information} />
            </div>
          </article>

          <PropertyContactCard
            reference={property.information?.reference}
            whatsappHref={whatsappHref}
          />
        </div>

        <SimilarProperties listings={similar} />
      </Container>
        </div>
      </div>
    </>
  )
}
