import { Bath, BedDouble, Heart, House, Maximize2, MapPin } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

import Badge from '../../../components/home/ui/Badge.jsx'
import { useFavorites } from '../../../hooks/useFavorites.js'

const factIcons = {
  area: Maximize2,
  bathrooms: Bath,
  bedrooms: BedDouble,
}

/**
 * Figma badge palette for the homepage showcase cards, keyed by transaction
 * type. The tokens carry the approved light hexes and only swap in dark mode,
 * where the original navy-on-navy badge lost all contrast.
 */
const showcaseBadgeStyles = {
  buy: 'border-transparent bg-home-gold text-home-on-gold',
  rent: 'border-transparent bg-home-heading text-home-panel',
  stays: 'border-home-gold bg-home-section text-home-heading',
}

/**
 * Displays a property summary without owning listing or favorite state.
 *
 * @param {object} props
 * @param {string} props.id
 * @param {{src: string, alt: string, width: number, height: number}} props.image
 * @param {string} props.listingType
 * @param {string} props.title
 * @param {string} props.location
 * @param {string} props.price
 * @param {string} props.href
 * @param {{type: keyof typeof factIcons, label: string, value: string}[]} props.facts
 * @param {string} props.favoriteLabel
 * @param {string} props.favoriteRemoveLabel
 * @param {boolean} [props.featured]
 * @param {boolean} [props.compact]
 * @param {boolean} [props.showcase] Applies the homepage Figma card treatment.
 * @param {string} [props.transactionType]
 */
export default function PropertyCard({
  id,
  image,
  listingType,
  title,
  location,
  price,
  href,
  facts,
  favoriteLabel,
  favoriteRemoveLabel,
  featured = false,
  compact = false,
  showcase = false,
  transactionType,
}) {
  const currentLocation = useLocation()
  const { isFavorite, toggleFavorite } = useFavorites()
  const favorite = isFavorite(id)
  const returnTo =
    currentLocation.pathname === '/properties'
      ? `${currentLocation.pathname}${currentLocation.search}`
      : undefined

  return (
    <article
      className={`group relative flex min-w-0 flex-col overflow-hidden transition-[transform,box-shadow] duration-standard hover:-translate-y-0.5 focus-within:shadow-[var(--shadow-md)] motion-reduce:transform-none motion-reduce:transition-none ${
        showcase
          ? 'rounded-[16px] border border-home-card-border bg-home-panel shadow-[0px_8px_28px_0px_rgba(18,36,59,0.08)] hover:shadow-[0px_12px_32px_0px_rgba(18,36,59,0.14)]'
          : 'rounded-lg border border-line bg-elevated shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]'
      }`}
    >
      <div
        className={`relative overflow-hidden bg-skeleton ${
          showcase
            ? 'aspect-[16/9] xl:aspect-auto xl:h-[190px]'
            : featured
              ? 'aspect-[16/9] lg:h-[26.25rem] lg:aspect-auto'
              : compact
                ? 'aspect-[16/9] lg:h-36 lg:aspect-auto xl:h-40'
                : 'aspect-[16/9]'
        }`}
      >
        {/* A listing with no uploaded image has no src at all. Rendering the
            img anyway would ask the browser to fetch the current page again
            and leave a broken frame, so the card falls back to a branded
            placeholder on the surface token. */}
        {image.src ? (
          <img
            alt={image.alt}
            className="size-full object-cover transition-transform duration-slow group-hover:scale-[1.035] motion-reduce:transform-none motion-reduce:transition-none"
            decoding="async"
            height={image.height}
            loading="lazy"
            src={image.src}
            width={image.width}
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-surface text-muted">
            <House aria-hidden="true" size={36} strokeWidth={1.5} />
            <span className="sr-only">{image.alt}</span>
          </div>
        )}
        {showcase ? (
          <span
            className={`absolute start-4 top-4 inline-flex h-[34px] min-w-[80px] items-center justify-center whitespace-nowrap rounded-[8px] border px-[10px] text-[18px] font-medium leading-[24px] ${
              showcaseBadgeStyles[transactionType] ?? showcaseBadgeStyles.buy
            }`}
          >
            {listingType}
          </span>
        ) : (
          <Badge
            className="absolute start-2 top-2 shadow-sm sm:start-4 sm:top-4"
            variant="surface"
          >
            {listingType}
          </Badge>
        )}
        <button
          aria-label={favorite ? favoriteRemoveLabel : favoriteLabel}
          aria-pressed={favorite}
          className={`favorite-button absolute end-2 top-2 z-[var(--z-raised)] inline-flex items-center justify-center rounded-full text-ink transition duration-standard focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none sm:end-4 sm:top-4 ${
            showcase
              ? 'size-10 bg-white/24 backdrop-blur-sm hover:bg-white/40'
              : 'size-11 bg-elevated shadow-sm hover:bg-hover'
          }`}
          data-favorite={favorite}
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            toggleFavorite(id)
          }}
          type="button"
        >
          <Heart
            aria-hidden="true"
            className="transition-[color,fill,stroke,transform] duration-standard active:scale-95 motion-reduce:transition-none"
            data-favorite-icon
            size={20}
          />
        </button>
      </div>

      <div
        className={`flex flex-1 flex-col ${
          showcase
            ? 'gap-[10px] p-[20px] xl:gap-[8px] xl:p-[16px]'
            : compact
              ? 'min-h-0 p-3 sm:p-5'
              : 'min-h-0 p-3 sm:min-h-48 sm:p-5'
        }`}
      >
        <div
          className={`flex min-w-0 items-center gap-1.5 ${
            showcase
              ? 'text-[18px] font-normal leading-[22px] text-home-muted xl:text-[16px] xl:leading-[20px]'
              : 'text-xs text-muted sm:text-sm'
          }`}
        >
          {!showcase && (
            <MapPin
              aria-hidden="true"
              className="hidden shrink-0 sm:block"
              size={16}
            />
          )}
          <span
            className={showcase ? 'min-w-0 xl:truncate' : 'truncate'}
            title={location}
          >
            {location}
          </span>
        </div>

        <h3
          className={
            showcase
              ? 'text-[20px] font-semibold leading-[32px] text-home-heading xl:line-clamp-2 xl:min-h-[56px] xl:text-[18px] xl:leading-[28px]'
              : 'mt-2 line-clamp-2 text-sm font-semibold leading-5 tracking-[-0.025em] text-ink sm:mt-3 sm:line-clamp-none sm:text-xl sm:leading-snug'
          }
        >
          <Link
            className="after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-3 focus-visible:after:outline-offset-[-3px] focus-visible:after:outline-accent"
            state={returnTo ? { from: returnTo } : undefined}
            to={href}
          >
            {title}
          </Link>
        </h3>

        <p
          className={
            showcase
              ? 'text-[20px] font-semibold leading-[30px] text-home-gold xl:whitespace-nowrap xl:text-[18px] xl:leading-[26px]'
              : 'mt-1.5 text-base font-bold text-ink sm:mt-2 sm:text-lg sm:font-semibold'
          }
        >
          {price}
        </p>

        {facts.length > 0 && (
          <dl
            className={`flex flex-wrap ${
              showcase
                ? 'w-full items-center justify-center gap-x-3 gap-y-[10px] p-[10px] text-[18px] font-normal leading-[22px] text-home-muted xl:mt-auto xl:gap-x-2 xl:p-0 xl:pt-[8px] xl:text-[15px] xl:leading-[20px]'
                : 'mt-auto gap-x-3 gap-y-1.5 border-t border-line pt-3 text-xs text-muted sm:gap-x-4 sm:gap-y-2 sm:pt-4 sm:text-sm'
            }`}
          >
            {facts.map((fact) => {
              const Icon = factIcons[fact.type]

              return (
                <div className="flex items-center gap-1.5" key={fact.type}>
                  {!showcase && <Icon aria-hidden="true" size={17} />}
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
