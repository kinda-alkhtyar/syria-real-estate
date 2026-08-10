import { Link, useLocation } from 'react-router-dom'

/** The row has space for the two facts the approved mobile screen shows. */
const rowFactTypes = ['bedrooms', 'area']

/**
 * Full-width listing row for phones and portrait tablets, matching screen 2a of
 * the approved mobile design: a 96px square thumbnail leading the row, then the
 * title, the gold price, the location, and the two headline facts.
 *
 * Desktop keeps `PropertyCard`, so this component is only rendered below `lg`.
 *
 * @param {object} props
 * @param {object} props.card Model produced by `toPropertyCardModel`.
 */
export default function ResultRowCard({ card }) {
  const currentLocation = useLocation()
  const returnTo =
    currentLocation.pathname === '/properties'
      ? `${currentLocation.pathname}${currentLocation.search}`
      : undefined
  const facts = card.facts.filter((fact) => rowFactTypes.includes(fact.type))

  return (
    <article className="relative flex gap-3 overflow-hidden rounded-[16px] border border-home-card-border bg-home-panel p-2.5">
      <div className="size-24 shrink-0 overflow-hidden rounded-[12px] bg-skeleton">
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

      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="line-clamp-2 text-[13px] font-bold leading-5 text-home-heading">
          <Link
            className="outline-none after:absolute after:inset-0 focus-visible:after:outline focus-visible:after:outline-3 focus-visible:after:outline-offset-[-3px] focus-visible:after:outline-accent"
            state={returnTo ? { from: returnTo } : undefined}
            to={card.href}
          >
            {card.title}
          </Link>
        </h3>
        <p className="mt-1 truncate text-sm font-extrabold leading-5 text-home-gold">
          {card.price}
        </p>
        <p className="mt-1 truncate text-[11.5px] leading-4 text-home-muted">
          {card.location}
        </p>
        {facts.length > 0 && (
          <dl className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] leading-4 text-home-muted">
            {facts.map((fact) => (
              <div className="flex items-center gap-1" key={fact.type}>
                <dt className="sr-only">{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </article>
  )
}
