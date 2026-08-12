import { AlertCircle, LoaderCircle, ShieldCheck } from 'lucide-react'
import { useCallback, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'

import { ApiError } from '../api/api-client.js'
import Button from '../components/ui/Button.jsx'
import { ForbiddenState } from '../features/auth/components/AuthRouteState.jsx'
import ReviewQueueList from '../features/management/components/ReviewQueueList.jsx'
import { pendingReviewFilter } from '../features/management/constants/listing-status-presentation.js'
import { useManagementProperties } from '../features/management/hooks/useManagementProperties.js'
import { useLocale } from '../hooks/useLocale.js'

function QueueState({ action, description, icon: Icon, title }) {
  return (
    <section
      aria-labelledby="review-state-title"
      className="rounded-2xl border border-line bg-surface px-5 py-14 text-center"
    >
      <Icon aria-hidden="true" className="mx-auto text-muted" size={30} />
      <h2 className="mt-4 text-xl font-semibold text-ink" id="review-state-title">
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-lg leading-7 text-muted">{description}</p>
      {action}
    </section>
  )
}

export default function ReviewQueuePage() {
  const { data, error, meta, page, retry, setPage, status } =
    useManagementProperties({ status: pendingReviewFilter })
  const { t } = useLocale()
  // Provided by the dashboard shell, which owns the navigation badge.
  const { refreshPendingCount } = useOutletContext() ?? {}

  useEffect(() => {
    const previousTitle = document.title
    document.title = `${t('review.title')} | ${t('brand.name')}`
    return () => {
      document.title = previousTitle
    }
  }, [t])

  const handleModerated = useCallback(() => {
    retry()
    refreshPendingCount?.()
  }, [refreshPendingCount, retry])

  if (error instanceof ApiError && error.status === 403) {
    return <ForbiddenState />
  }

  return (
    <section aria-labelledby="review-title">
      <header className="mb-7 border-b border-line pb-6">
        <p className="text-sm font-bold uppercase tracking-wide text-accent">
          {t('review.eyebrow')}
        </p>
        <h1
          className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl"
          id="review-title"
        >
          {t('review.title')}
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-muted">
          {t('review.description')}
        </p>
        {status === 'ready' && meta?.total > 0 && (
          <p className="mt-3 text-sm font-semibold text-muted">
            {t('review.queue.total', { count: meta.total })}
          </p>
        )}
      </header>

      {status === 'loading' && (
        <div
          aria-live="polite"
          className="flex min-h-64 items-center justify-center gap-3 rounded-2xl border border-line bg-surface text-muted"
          role="status"
        >
          <LoaderCircle
            aria-hidden="true"
            className="animate-spin motion-reduce:animate-none"
            size={22}
          />
          <span className="font-semibold">{t('review.queue.loading')}</span>
        </div>
      )}

      {status === 'empty' && (
        <QueueState
          description={t('review.queue.emptyDescription')}
          icon={ShieldCheck}
          title={t('review.queue.emptyTitle')}
        />
      )}

      {status === 'error' && (
        <QueueState
          action={
            <Button className="mt-6" onClick={retry} variant="secondary">
              {t('dashboard.properties.retry')}
            </Button>
          }
          description={
            error instanceof ApiError && error.status === 401
              ? t('dashboard.properties.sessionExpired')
              : t('review.queue.errorDescription')
          }
          icon={AlertCircle}
          title={t('review.queue.errorTitle')}
        />
      )}

      {status === 'ready' && (
        <ReviewQueueList
          meta={meta}
          onModerated={handleModerated}
          page={page}
          properties={data}
          setPage={setPage}
        />
      )}
    </section>
  )
}
