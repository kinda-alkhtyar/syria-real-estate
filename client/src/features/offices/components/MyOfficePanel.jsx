import { Building2, Pencil, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useLocale } from '../../../hooks/useLocale.js'
import { toOfficeCardModel } from '../adapters/to-office-model.js'
import OfficeAvatar from './OfficeAvatar.jsx'

const actionClasses =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold outline-none transition duration-standard ease-standard focus-visible:ring-3 focus-visible:ring-focus/35 motion-reduce:transition-none'

/**
 * Sits above the public office grid for a signed-in owner: an invitation to
 * create the first office, or a shortcut into the one they already run.
 *
 * Renders nothing for a visitor, while the request is in flight, or if the
 * lookup failed — the public list below is the page's real content and must
 * not be held up by it.
 *
 * @param {object} props
 * @param {object | null} props.office
 * @param {'hidden' | 'loading' | 'none' | 'ready' | 'error'} props.status
 */
export default function MyOfficePanel({ office, status }) {
  const { locale, t } = useLocale()

  if (status === 'none') {
    return (
      <section className="mb-6 flex flex-col gap-4 rounded-2xl border border-accent/35 bg-accent/8 p-5 sm:mb-8 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex min-w-0 items-start gap-4">
          <span
            aria-hidden="true"
            className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-surface text-accent"
          >
            <Building2 size={24} />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-ink sm:text-lg">
              {t('offices.mine.createTitle')}
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              {t('offices.mine.createDescription')}
            </p>
          </div>
        </div>
        <Link
          className={`${actionClasses} shrink-0 bg-action text-on-action shadow-sm hover:bg-action-hover`}
          style={{ color: 'var(--primary-action-text)' }}
          to="/offices/new"
        >
          <Plus aria-hidden="true" size={18} />
          {t('offices.mine.createAction')}
        </Link>
      </section>
    )
  }

  if (status !== 'ready' || !office) return null

  const model = toOfficeCardModel(office, locale.code, t)

  return (
    <section className="mb-6 flex flex-col gap-4 rounded-2xl border border-line bg-elevated p-5 shadow-[var(--shadow-sm)] sm:mb-8 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="flex min-w-0 items-center gap-4">
        <OfficeAvatar initials={model.initials} logoUrl={model.logoUrl} />
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-accent [&:lang(ar)]:tracking-normal">
            {t('offices.mine.label')}
          </p>
          <h2 className="mt-1 truncate text-base font-semibold text-ink sm:text-lg">
            {model.name}
          </h2>
          <p className="mt-1 truncate text-sm text-muted">
            {[model.location, t('offices.count', { count: model.propertyCount })]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Link
          className={`${actionClasses} border border-line bg-surface text-ink hover:bg-hover`}
          to={`/offices/${model.id}`}
        >
          {t('offices.mine.viewAction')}
        </Link>
        <Link
          className={`${actionClasses} border border-line bg-surface text-ink hover:bg-hover`}
          to={`/offices/${model.id}/edit`}
        >
          <Pencil aria-hidden="true" size={16} />
          {t('offices.mine.editAction')}
        </Link>
      </div>
    </section>
  )
}
