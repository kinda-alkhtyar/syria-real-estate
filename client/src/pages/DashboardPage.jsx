import { AlertCircle, Building2, LoaderCircle } from 'lucide-react'
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

import Button from '../components/ui/Button.jsx'
import { ApiError } from '../api/api-client.js'
import { ForbiddenState } from '../features/auth/components/AuthRouteState.jsx'
import ManagementPropertyList from '../features/management/components/ManagementPropertyList.jsx'
import { useManagementProperties } from '../features/management/hooks/useManagementProperties.js'
import { useLocale } from '../hooks/useLocale.js'

function DashboardState({ action, description, icon: Icon, title }) {
  return (
    <section
      aria-labelledby="dashboard-state-title"
      className="rounded-2xl border border-line bg-surface px-5 py-14 text-center"
    >
      <Icon aria-hidden="true" className="mx-auto text-muted" size={30} />
      <h2 className="mt-4 text-xl font-semibold text-ink" id="dashboard-state-title">
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-lg leading-7 text-muted">
        {description}
      </p>
      {action}
    </section>
  )
}

export default function DashboardPage() {
  const {
    data,
    error,
    meta,
    page,
    retry,
    setPage,
    status,
  } = useManagementProperties()
  const { t } = useLocale()
  const location = useLocation()

  useEffect(() => {
    const previousTitle = document.title
    document.title = `${t('dashboard.title')} | ${t('brand.name')}`
    return () => {
      document.title = previousTitle
    }
  }, [t])

  if (error instanceof ApiError && error.status === 403) {
    return <ForbiddenState />
  }

  return (
    <section aria-labelledby="dashboard-title">
      <header className="mb-7 border-b border-line pb-6">
        <p className="text-sm font-bold uppercase tracking-wide text-accent">
          {t('dashboard.eyebrow')}
        </p>
        <h1
          className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl"
          id="dashboard-title"
        >
          {t('dashboard.title')}
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-muted">
          {t('dashboard.description')}
        </p>
      </header>

      {(location.state?.propertyCreated ||
        location.state?.propertyUpdated) && (
        <p
          aria-live="polite"
          className="mb-6 rounded-xl border border-success/35 bg-success/10 px-4 py-3 font-semibold text-ink"
          role="status"
        >
          {t(
            location.state.propertyUpdated
              ? 'propertyEdit.feedback.success'
              : 'propertyCreate.feedback.success',
          )}
        </p>
      )}

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
          <span className="font-semibold">
            {t('dashboard.properties.loading')}
          </span>
        </div>
      )}

      {status === 'empty' && (
        <DashboardState
          description={t('dashboard.properties.emptyDescription')}
          icon={Building2}
          title={t('dashboard.properties.emptyTitle')}
        />
      )}

      {status === 'error' && (
        <DashboardState
          action={
            <Button className="mt-6" onClick={retry} variant="secondary">
              {t('dashboard.properties.retry')}
            </Button>
          }
          description={
            error instanceof ApiError && error.status === 401
              ? t('dashboard.properties.sessionExpired')
              : t('dashboard.properties.errorDescription')
          }
          icon={AlertCircle}
          title={t('dashboard.properties.errorTitle')}
        />
      )}

      {status === 'ready' && (
        <ManagementPropertyList
          meta={meta}
          onPropertyChanged={retry}
          page={page}
          properties={data}
          setPage={setPage}
        />
      )}
    </section>
  )
}
