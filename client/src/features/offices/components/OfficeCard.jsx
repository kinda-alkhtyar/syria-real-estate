import { Building2, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useLocale } from '../../../hooks/useLocale.js'
import OfficeAvatar from './OfficeAvatar.jsx'

/**
 * One office in the grid. The whole card is the link target: the anchor spans
 * the card through its `after` pseudo-element, which keeps a single focusable
 * element and a single accessible name.
 *
 * @param {object} props
 * @param {ReturnType<import('../adapters/to-office-model.js').toOfficeCardModel>} props.office
 */
export default function OfficeCard({ office }) {
  const { t } = useLocale()

  return (
    <article className="group relative flex h-full min-w-0 gap-4 rounded-2xl border border-line bg-elevated p-4 shadow-[var(--shadow-sm)] transition-[transform,box-shadow] duration-standard hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] focus-within:shadow-[var(--shadow-md)] motion-reduce:transform-none motion-reduce:transition-none sm:p-5">
      <OfficeAvatar initials={office.initials} logoUrl={office.logoUrl} />

      <div className="flex min-w-0 flex-1 flex-col">
        <h2 className="line-clamp-2 text-base font-semibold leading-snug text-ink sm:text-lg">
          <Link
            className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-3 focus-visible:after:outline-offset-[-3px] focus-visible:after:outline-accent"
            to={office.href}
          >
            {office.name}
          </Link>
        </h2>

        {office.location && (
          <p className="mt-1.5 flex min-w-0 items-center gap-1.5 text-xs text-muted sm:text-sm">
            <MapPin aria-hidden="true" className="shrink-0" size={15} />
            <span className="truncate">{office.location}</span>
          </p>
        )}

        <span className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-bold text-ink sm:text-xs">
          <Building2 aria-hidden="true" size={13} />
          {t('offices.count', { count: office.propertyCount })}
        </span>
      </div>
    </article>
  )
}
