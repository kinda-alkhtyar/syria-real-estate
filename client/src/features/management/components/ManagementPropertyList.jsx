import {
  Archive,
  House,
  Image,
  MapPin,
  Pencil,
  RotateCcw,
  Video,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import Button from '../../../components/ui/Button.jsx'
import { ApiError } from '../../../api/api-client.js'
import { useLocale } from '../../../hooks/useLocale.js'
import { toManagementPropertyModel } from '../adapters/to-management-property-model.js'
import { archiveProperty, restoreProperty } from '../api/management-property-api.js'

const actionClasses =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-ink outline-none transition hover:bg-hover focus-visible:ring-3 focus-visible:ring-focus/35 disabled:cursor-not-allowed disabled:opacity-55'

const statusStyles = {
  archived: 'border-line bg-hover text-muted',
  available: 'border-success/35 bg-success/10 text-success',
  draft: 'border-warning/35 bg-warning/10 text-warning',
  rented: 'border-line bg-hover text-muted',
  reserved: 'border-warning/35 bg-warning/10 text-warning',
  sold: 'border-line bg-hover text-muted',
}

function ActionButton({ children, disabled, icon: Icon, onClick }) {
  return (
    <button
      className={actionClasses}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <Icon aria-hidden="true" size={16} />
      {children}
    </button>
  )
}

export default function ManagementPropertyList({
  properties,
  meta,
  onPropertyChanged,
  page,
  setPage,
}) {
  const { locale, t } = useLocale()
  const [actionErrorKey, setActionErrorKey] = useState('')
  const [pendingId, setPendingId] = useState('')
  const models = properties.map((property) =>
    toManagementPropertyModel(property, locale.code, t),
  )

  async function runLifecycleAction(property, action) {
    if (!window.confirm(t(`dashboard.confirmations.${action}`))) return

    setActionErrorKey('')
    setPendingId(property.id)
    try {
      await (action === 'archive'
        ? archiveProperty(property.id)
        : restoreProperty(property.id))
      setPendingId('')
      onPropertyChanged?.()
      return
    } catch (error) {
      setActionErrorKey(
        error instanceof ApiError && error.code === 'NETWORK_ERROR'
          ? 'dashboard.actionFeedback.network'
          : 'dashboard.actionFeedback.unexpected',
      )
    }
    setPendingId('')
  }

  return (
    <>
      {actionErrorKey && (
        <p
          aria-live="assertive"
          className="mb-4 rounded-xl border border-error/35 bg-error/10 px-4 py-3 font-semibold text-ink"
          role="alert"
        >
          {t(actionErrorKey)}
        </p>
      )}

      <ul aria-label={t('dashboard.properties.listLabel')} className="grid gap-4">
        {models.map((property) => (
          <li key={property.id}>
            <article className="grid overflow-hidden rounded-2xl border border-line bg-elevated sm:grid-cols-[12rem_minmax(0,1fr)]">
              <div className="aspect-[16/9] bg-skeleton sm:aspect-auto sm:min-h-52">
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
                  <div className="min-w-0">
                    <h2 className="text-xl font-semibold text-ink">
                      {property.title}
                    </h2>
                    <p className="mt-2 flex items-start gap-2 text-sm text-muted">
                      <MapPin aria-hidden="true" className="mt-0.5 shrink-0" size={16} />
                      <span>{property.location}</span>
                    </p>
                  </div>
                  <span
                    className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${statusStyles[property.status] ?? statusStyles.archived}`}
                  >
                    {property.statusLabel}
                  </span>
                </div>

                <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3 text-sm lg:grid-cols-4">
                  {[
                    ['transaction', property.transaction],
                    ['type', property.propertyType],
                    ['price', property.price],
                    ['updated', property.updatedAt],
                  ].map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-xs font-semibold text-muted">
                        {t(`dashboard.properties.fields.${key}`)}
                      </dt>
                      <dd className="mt-1 font-semibold text-ink">{value}</dd>
                    </div>
                  ))}
                </dl>

                <div
                  aria-label={t('dashboard.properties.actionsLabel')}
                  className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4"
                >
                  <Link
                    className={actionClasses}
                    to={`/dashboard/properties/${property.id}/edit`}
                  >
                    <Pencil aria-hidden="true" size={16} />
                    {t('dashboard.actions.edit')}
                  </Link>
                  {property.status === 'archived' ? (
                    <ActionButton
                      disabled={pendingId === property.id}
                      icon={RotateCcw}
                      onClick={() => runLifecycleAction(property, 'restore')}
                    >
                      {t('dashboard.actions.restore')}
                    </ActionButton>
                  ) : (
                    <ActionButton
                      disabled={pendingId === property.id}
                      icon={Archive}
                      onClick={() => runLifecycleAction(property, 'archive')}
                    >
                      {t('dashboard.actions.archive')}
                    </ActionButton>
                  )}
                  <Link
                    className={actionClasses}
                    to={`/dashboard/properties/${property.id}/images`}
                  >
                    <Image aria-hidden="true" size={16} />
                    {t('dashboard.actions.images')}
                  </Link>
                  <Link
                    className={actionClasses}
                    to={`/dashboard/properties/${property.id}/video`}
                  >
                    <Video aria-hidden="true" size={16} />
                    {t('dashboard.actions.video')}
                  </Link>
                </div>
              </div>
            </article>
          </li>
        ))}
      </ul>

      {meta?.totalPages > 1 && (
        <nav
          aria-label={t('dashboard.properties.pagination')}
          className="mt-6 flex items-center justify-between gap-4"
        >
          <Button
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
            variant="secondary"
          >
            {t('actions.previousPage')}
          </Button>
          <p className="text-sm font-semibold text-muted">
            {t('results.pageOf', {
              page,
              pageCount: meta.totalPages,
            })}
          </p>
          <Button
            disabled={page >= meta.totalPages}
            onClick={() => setPage((current) => current + 1)}
            variant="secondary"
          >
            {t('actions.nextPage')}
          </Button>
        </nav>
      )}
    </>
  )
}
