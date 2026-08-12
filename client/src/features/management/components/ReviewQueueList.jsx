import { CalendarClock, Check, House, MapPin, SquarePen, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { ApiError } from '../../../api/api-client.js'
import Button from '../../../components/ui/Button.jsx'
import { useLocale } from '../../../hooks/useLocale.js'
import { toManagementPropertyModel } from '../adapters/to-management-property-model.js'
import { approveProperty, rejectProperty } from '../api/management-property-api.js'
import ModerationDialog from './ModerationDialog.jsx'

const actionClasses =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-ink outline-none transition hover:bg-hover focus-visible:ring-3 focus-visible:ring-focus/35 disabled:cursor-not-allowed disabled:opacity-55'

function errorKeyFor(error) {
  if (error instanceof ApiError && error.code === 'NETWORK_ERROR') {
    return 'review.feedback.network'
  }
  if (error instanceof ApiError && error.status === 404) {
    return 'review.feedback.missing'
  }
  return 'review.feedback.unexpected'
}

export default function ReviewQueueList({
  meta,
  onModerated,
  page,
  properties,
  setPage,
}) {
  const { locale, t } = useLocale()
  // `{ id, variant }` while a decision is open, null otherwise.
  const [decision, setDecision] = useState(null)
  const [dialogErrorKey, setDialogErrorKey] = useState('')
  const [pending, setPending] = useState(false)
  const models = properties.map((property) =>
    toManagementPropertyModel(property, locale.code, t),
  )
  const active = models.find((property) => property.id === decision?.id)

  function closeDialog() {
    setDecision(null)
    setDialogErrorKey('')
  }

  async function confirmDecision(reason) {
    setPending(true)
    setDialogErrorKey('')
    try {
      await (decision.variant === 'approve'
        ? approveProperty(decision.id)
        : rejectProperty(decision.id, reason))
      setPending(false)
      closeDialog()
      // The moderated listing leaves the queue, so both the list and the badge
      // are refetched rather than patched in place.
      onModerated?.()
      return
    } catch (error) {
      setDialogErrorKey(errorKeyFor(error))
    }
    setPending(false)
  }

  return (
    <>
      <ul aria-label={t('review.queue.listLabel')} className="grid gap-4">
        {models.map((property) => (
          <li key={property.id}>
            <article className="grid overflow-hidden rounded-2xl border border-line bg-elevated sm:grid-cols-[12rem_minmax(0,1fr)]">
              <div className="aspect-[16/9] bg-skeleton sm:aspect-auto sm:min-h-48">
                {property.image ? (
                  <img
                    alt={property.image.alt}
                    className="size-full object-cover"
                    height={property.image.height}
                    loading="lazy"
                    src={property.image.src}
                    width={property.image.width}
                  />
                ) : (
                  <div className="flex size-full min-h-40 items-center justify-center text-muted">
                    <House aria-hidden="true" size={30} />
                    <span className="sr-only">
                      {t('dashboard.properties.noImage')}
                    </span>
                  </div>
                )}
              </div>

              <div className="min-w-0 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h2 className="min-w-0 text-xl font-semibold text-ink">
                    {property.title}
                  </h2>
                  <span
                    className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${property.statusChipClass}`}
                  >
                    {property.statusLabel}
                  </span>
                </div>

                <p className="mt-2 flex items-start gap-2 text-sm text-muted">
                  <MapPin aria-hidden="true" className="mt-0.5 shrink-0" size={16} />
                  <span>{property.location}</span>
                </p>
                <p className="mt-1.5 flex items-start gap-2 text-sm text-muted">
                  <CalendarClock
                    aria-hidden="true"
                    className="mt-0.5 shrink-0"
                    size={16}
                  />
                  <span>
                    {t('review.queue.submittedOn', {
                      date: property.updatedAt,
                    })}
                  </span>
                </p>

                <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 text-sm lg:grid-cols-3">
                  {[
                    ['governorate', property.governorate],
                    ['type', property.propertyType],
                    ['price', property.price],
                  ].map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-xs font-semibold text-muted">
                        {t(`review.queue.fields.${key}`)}
                      </dt>
                      <dd className="mt-1 font-semibold text-ink">{value}</dd>
                    </div>
                  ))}
                </dl>

                <div
                  aria-label={t('review.queue.actionsLabel')}
                  className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4"
                >
                  <Link
                    className={actionClasses}
                    to={`/dashboard/properties/${property.id}/edit`}
                  >
                    <SquarePen aria-hidden="true" size={16} />
                    {t('review.actions.openDetails')}
                  </Link>
                  <button
                    className={actionClasses}
                    onClick={() =>
                      setDecision({ id: property.id, variant: 'approve' })
                    }
                    type="button"
                  >
                    <Check aria-hidden="true" size={16} />
                    {t('review.actions.approve')}
                  </button>
                  <button
                    className={`${actionClasses} text-error`}
                    onClick={() =>
                      setDecision({ id: property.id, variant: 'reject' })
                    }
                    type="button"
                  >
                    <X aria-hidden="true" size={16} />
                    {t('review.actions.reject')}
                  </button>
                </div>
              </div>
            </article>
          </li>
        ))}
      </ul>

      {meta?.totalPages > 1 && (
        <nav
          aria-label={t('review.queue.pagination')}
          className="mt-6 flex items-center justify-between gap-4"
        >
          <Button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            variant="secondary"
          >
            {t('actions.previousPage')}
          </Button>
          <p className="text-sm font-semibold text-muted">
            {t('results.pageOf', { page, pageCount: meta.totalPages })}
          </p>
          <Button
            disabled={page >= meta.totalPages}
            onClick={() => setPage(page + 1)}
            variant="secondary"
          >
            {t('actions.nextPage')}
          </Button>
        </nav>
      )}

      {decision && active && (
        <ModerationDialog
          errorMessage={dialogErrorKey ? t(dialogErrorKey) : ''}
          onCancel={closeDialog}
          onConfirm={confirmDecision}
          pending={pending}
          propertyTitle={active.title}
          variant={decision.variant}
        />
      )}
    </>
  )
}
