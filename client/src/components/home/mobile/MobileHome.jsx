import {
  BadgeDollarSign,
  BedDouble,
  ChevronDown,
  ChevronLeft,
  Heart,
  MapPinned,
  Maximize2,
  Search,
  ShieldCheck,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { syrianGovernorates } from '../../../constants/syrian-governorates.js'
import { toPropertyCardModel } from '../../../features/properties/adapters/to-property-card-model.js'
import { propertyCatalog } from '../../../features/properties/catalog/property-catalog.js'
import { useProperties } from '../../../features/properties/hooks/useProperties.js'
import { selectFeaturedProperties } from '../../../features/properties/utils/select-featured-properties.js'
import { propertyTypes } from '../../../features/property-search/constants/property-types.js'
import { useFavorites } from '../../../hooks/useFavorites.js'
import { useLocale } from '../../../hooks/useLocale.js'

const featuredCount = 6
const latestCount = 6

/** The rail card only has room for the two facts the design shows. */
const railFactTypes = ['bedrooms', 'area']
const railFactIcons = { area: Maximize2, bedrooms: BedDouble }

const quickChips = [
  { labelKey: 'transactionTypes.buy', to: '/properties?transactionType=buy' },
  { labelKey: 'transactionTypes.rent', to: '/properties?transactionType=rent' },
  {
    labelKey: 'transactionTypes.stays',
    to: '/properties?transactionType=stays',
  },
]

/** Same indicators and glyphs as the desktop trust band, condensed to one row. */
const trustItems = [
  { icon: ShieldCheck, labelKey: 'trust.moderated.value' },
  { icon: BadgeDollarSign, labelKey: 'trust.currency.value' },
  { icon: Search, labelKey: 'trust.search.value' },
  { icon: MapPinned, labelKey: 'trust.local.value' },
]

const chipBaseClassName =
  'inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-focus/30'
const chipQuietClassName = `${chipBaseClassName} border border-home-card-border bg-home-section text-home-heading`

/**
 * Category glyphs are drawn inline rather than imported so every property type
 * in the existing enum gets a purpose-built mark at one consistent weight.
 */
const categoryGlyphs = {
  apartment: (
    <>
      <path d="M4 21V5.5A1.5 1.5 0 0 1 5.5 4h7A1.5 1.5 0 0 1 14 5.5V21" />
      <path d="M14 10h4.5A1.5 1.5 0 0 1 20 11.5V21" />
      <path d="M2 21h20" />
      <path d="M7 8h1.5M7 12h1.5M7 16h1.5M11 8h.5M11 12h.5M17 14h.5M17 17.5h.5" />
    </>
  ),
  house: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.8V21h14V9.8" />
      <path d="M10 21v-6h4v6" />
    </>
  ),
  land: (
    <>
      <path d="M3 19h18" />
      <path d="m3 19 4-8 4 4 3-6 7 10" />
      <circle cx="7.5" cy="6.5" r="2" />
    </>
  ),
  commercial: (
    <>
      <path d="M3 21h18" />
      <path d="M4 21V9l8-5 8 5v12" />
      <path d="M9 21v-5h6v5" />
      <path d="M8 12h1.5M14.5 12H16" />
    </>
  ),
  studio: (
    <>
      <rect height="14" rx="1.5" width="18" x="3" y="5" />
      <path d="M3 10h18" />
      <path d="M8 19v-4h8v4" />
    </>
  ),
  villa: (
    <>
      <path d="M2 21h20" />
      <path d="M4 21V11l6-4 6 4v10" />
      <path d="M16 21V13h4v8" />
      <path d="M8.5 21v-4.5h3V21" />
    </>
  ),
  townhouse: (
    <>
      <path d="M2 21h20" />
      <path d="M3 21V10l4.5-3.5L12 10v11" />
      <path d="M12 21V10l4.5-3.5L21 10v11" />
      <path d="M6 21v-4h3v4M15 21v-4h3v4" />
    </>
  ),
}

function CategoryGlyph({ type }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
      viewBox="0 0 24 24"
      width="24"
    >
      {categoryGlyphs[type]}
    </svg>
  )
}

function SectionHeading({ href, title, titleId, viewAllLabel }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <h2
        className="text-base font-bold leading-tight text-home-heading"
        id={titleId}
      >
        {title}
      </h2>
      <Link
        className="inline-flex min-h-11 shrink-0 items-center gap-0.5 text-xs font-semibold text-home-gold outline-none focus-visible:ring-3 focus-visible:ring-focus/30"
        to={href}
      >
        {viewAllLabel}
        <ChevronLeft aria-hidden="true" className="rtl:-scale-x-100" size={14} />
      </Link>
    </div>
  )
}

function FeaturedCard({ badgeLabel, card, featured }) {
  const { isFavorite, toggleFavorite } = useFavorites()
  const favorite = isFavorite(card.id)
  const facts = card.facts.filter((fact) => railFactTypes.includes(fact.type))

  return (
    <article className="relative flex w-[70vw] max-w-[260px] shrink-0 snap-start flex-col overflow-hidden rounded-[16px] border border-home-card-border bg-home-panel shadow-[var(--shadow-sm)]">
      <div className="relative aspect-[16/10] overflow-hidden bg-skeleton">
        <img
          alt={card.image.alt}
          className="size-full object-cover"
          decoding="async"
          height={card.image.height}
          loading="lazy"
          src={card.image.src}
          width={card.image.width}
        />
        {featured && (
          <span className="absolute start-2 top-2 inline-flex items-center rounded-full bg-home-heading px-2.5 py-1 text-[10px] font-bold leading-none text-home-gold">
            {badgeLabel}
          </span>
        )}
        <button
          aria-label={favorite ? card.favoriteRemoveLabel : card.favoriteLabel}
          aria-pressed={favorite}
          className="favorite-button absolute end-1 top-1 z-[var(--z-raised)] inline-flex size-11 items-center justify-center rounded-full text-ink transition duration-standard focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
          data-favorite={favorite}
          onClick={() => toggleFavorite(card.id)}
          type="button"
        >
          <span className="inline-flex size-8 items-center justify-center rounded-full bg-home-panel/90 shadow-sm">
            <Heart aria-hidden="true" data-favorite-icon size={17} />
          </span>
        </button>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 p-3">
        <p className="truncate text-base font-bold leading-6 text-home-gold">
          {card.price}
        </p>
        <h3 className="line-clamp-1 text-sm font-semibold leading-5 text-home-heading">
          <Link
            className="outline-none after:absolute after:inset-0 focus-visible:after:outline focus-visible:after:outline-3 focus-visible:after:outline-offset-[-3px] focus-visible:after:outline-accent"
            to={card.href}
          >
            {card.title}
          </Link>
        </h3>
        <p className="truncate text-xs leading-5 text-home-muted">
          {card.location}
        </p>
        {facts.length > 0 && (
          <dl className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[11px] leading-4 text-home-muted">
            {facts.map((fact) => {
              const Icon = railFactIcons[fact.type]

              return (
                <div className="flex items-center gap-1" key={fact.type}>
                  <Icon aria-hidden="true" size={14} />
                  <dt className="sr-only">{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              )
            })}
          </dl>
        )}
      </div>
    </article>
  )
}

/** Compact tile for the two-column grid: at 320px each column is only ~140px. */
function LatestCard({ card }) {
  return (
    <article className="relative flex min-w-0 flex-col overflow-hidden rounded-[14px] border border-home-card-border bg-home-panel shadow-[var(--shadow-sm)]">
      <div className="aspect-[4/3] overflow-hidden bg-skeleton">
        <img
          alt={card.image.alt}
          className="size-full object-cover"
          decoding="async"
          height={card.image.height}
          loading="lazy"
          src={card.image.src}
          width={card.image.width}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 p-2.5">
        <h3 className="line-clamp-2 text-xs font-semibold leading-4 text-home-heading">
          <Link
            className="outline-none after:absolute after:inset-0 focus-visible:after:outline focus-visible:after:outline-3 focus-visible:after:outline-offset-[-3px] focus-visible:after:outline-accent"
            to={card.href}
          >
            {card.title}
          </Link>
        </h3>
        <p className="truncate text-sm font-bold leading-5 text-home-gold">
          {card.price}
        </p>
        <p className="truncate text-[11px] leading-4 text-home-muted">
          {card.location}
        </p>
      </div>
    </article>
  )
}

function CardSkeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-[16px] border border-home-card-border bg-home-panel ${className}`}
    >
      <div className="aspect-[4/3] rounded-t-[16px] bg-skeleton" />
      <div className="space-y-2 p-3">
        <div className="h-3 w-4/5 rounded bg-skeleton" />
        <div className="h-3 w-2/5 rounded bg-skeleton" />
      </div>
    </div>
  )
}

/**
 * Search-first home screen for phones and portrait tablets.
 *
 * Every destination is an existing route with existing filter parameters, so no
 * new query contract is introduced.
 */
export default function MobileHome() {
  const [areTypesOpen, setAreTypesOpen] = useState(false)
  const { locale, t } = useLocale()
  const { properties, retry, status } = useProperties()
  const isLoading = status === 'loading'
  const source = status === 'error' ? propertyCatalog : properties

  const byNewest = [...source].sort(
    (first, second) =>
      new Date(second.publishedAt ?? 0) - new Date(first.publishedAt ?? 0),
  )
  const featured = selectFeaturedProperties(source, featuredCount)
  const latest = byNewest.slice(0, latestCount)
  const toCard = (listing) => toPropertyCardModel(listing, locale.code, t)

  return (
    <div className="bg-canvas pb-6">
      <section
        aria-labelledby="mobile-search-title"
        className="border-b border-home-card-border bg-home-panel px-4 pb-4 pt-5"
      >
        <p className="text-sm font-medium leading-5 text-home-muted">
          {t('homepage.mobile.greeting')}
        </p>
        <h1
          className="mt-1 text-xl font-bold leading-8 text-home-heading"
          id="mobile-search-title"
        >
          {t('homepage.mobile.title')}
        </h1>

        <Link
          className="mt-3 flex min-h-[52px] items-center gap-3 rounded-full border border-home-card-border bg-home-section px-4 text-start outline-none transition duration-fast ease-standard focus-visible:ring-3 focus-visible:ring-focus/30 motion-reduce:transition-none"
          to="/properties"
        >
          <Search
            aria-hidden="true"
            className="shrink-0 text-home-gold"
            size={19}
          />
          <span className="min-w-0 truncate text-sm text-home-muted">
            {t('homepage.mobile.searchPlaceholder')}
          </span>
        </Link>

        <ul className="mt-3 flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {quickChips.map((chip, index) => (
            <li key={chip.to}>
              <Link
                className={
                  index === 0
                    ? `${chipBaseClassName} border border-transparent bg-home-gold text-home-on-gold`
                    : chipQuietClassName
                }
                to={chip.to}
              >
                {t(chip.labelKey)}
              </Link>
            </li>
          ))}
          <li>
            <button
              aria-controls="mobile-types-panel"
              aria-expanded={areTypesOpen}
              className={chipQuietClassName}
              onClick={() => setAreTypesOpen((isOpen) => !isOpen)}
              type="button"
            >
              {t('homepage.mobile.categories')}
              <ChevronDown
                aria-hidden="true"
                className={`transition-transform duration-fast ease-standard motion-reduce:transition-none ${
                  areTypesOpen ? 'rotate-180' : ''
                }`}
                size={14}
              />
            </button>
          </li>
        </ul>

        {areTypesOpen && (
          <ul
            className="mt-3 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            id="mobile-types-panel"
          >
            {propertyTypes.map((type) => (
              <li key={type.id}>
                <Link
                  className="flex w-[64px] flex-col items-center gap-1.5 outline-none focus-visible:ring-3 focus-visible:ring-focus/30"
                  to={`/properties?propertyType=${type.id}`}
                >
                  <span className="inline-flex size-12 items-center justify-center rounded-full bg-home-gold-soft text-home-heading">
                    <CategoryGlyph type={type.id} />
                  </span>
                  <span className="w-full truncate text-center text-[11px] font-semibold leading-tight text-home-muted">
                    {t(type.labelKey)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="mobile-featured-title" className="mt-4">
        <div className="px-4">
          <SectionHeading
            href="/properties"
            title={t('homepage.mobile.featured')}
            titleId="mobile-featured-title"
            viewAllLabel={t('actions.browseAll')}
          />
        </div>
        {isLoading ? (
          <div className="flex gap-3 px-4">
            <CardSkeleton className="w-[70vw] max-w-[260px] shrink-0" />
            <CardSkeleton className="w-[70vw] max-w-[260px] shrink-0" />
          </div>
        ) : featured.length > 0 ? (
          <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {featured.map((listing) => (
              <li className="flex" key={listing.id}>
                <FeaturedCard
                  badgeLabel={t('homepage.mobile.featuredBadge')}
                  card={toCard(listing)}
                  featured={Boolean(listing.featured)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 text-sm text-home-muted">
            {t('results.states.empty.description')}
          </p>
        )}
      </section>

      <nav
        aria-labelledby="mobile-cities-title"
        className="mt-3 px-4 pb-4"
      >
        <h2
          className="mb-2 text-base font-bold leading-tight text-home-heading"
          id="mobile-cities-title"
        >
          {t('homepage.mobile.cities')}
        </h2>
        <ul className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {syrianGovernorates.map((governorate) => (
            <li key={governorate.id}>
              <Link
                className={`${chipBaseClassName} border border-home-card-border bg-home-panel font-medium text-home-heading`}
                to={`/properties?governorate=${governorate.id}`}
              >
                {t(governorate.labelKey)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <ul className="grid grid-cols-4 gap-2 border-y border-home-card-border bg-home-panel px-3 py-4">
        {trustItems.map((item) => {
          const Icon = item.icon

          return (
            <li
              className="flex min-w-0 flex-col items-center gap-1.5"
              key={item.labelKey}
            >
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-home-section text-home-heading">
                <Icon aria-hidden="true" size={16} strokeWidth={1.8} />
              </span>
              <span className="text-center text-[10px] font-semibold leading-tight text-home-muted">
                {t(item.labelKey)}
              </span>
            </li>
          )
        })}
      </ul>

      <section aria-labelledby="mobile-latest-title" className="mt-4 px-4">
        <SectionHeading
          href="/properties"
          title={t('homepage.mobile.latest')}
          titleId="mobile-latest-title"
          viewAllLabel={t('actions.browseAll')}
        />
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : latest.length > 0 ? (
          <ul className="grid grid-cols-2 gap-3">
            {latest.map((listing) => (
              <li className="flex" key={listing.id}>
                <LatestCard card={toCard(listing)} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-home-muted">
            {t('results.states.empty.description')}
          </p>
        )}
        {status === 'error' && (
          <button
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border border-line px-4 text-sm font-semibold text-home-heading"
            onClick={retry}
            type="button"
          >
            {t('results.states.error.action')}
          </button>
        )}
      </section>
    </div>
  )
}
