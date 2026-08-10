import { AlertCircle, LoaderCircle } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'

import Button from '../components/ui/Button.jsx'
import { ApiError } from '../api/api-client.js'
import { ForbiddenState } from '../features/auth/components/AuthRouteState.jsx'
import PropertyCreationForm from '../features/management/components/PropertyCreationForm.jsx'
import { useManagementProperty } from '../features/management/hooks/useManagementProperty.js'
import { toPropertyFormValues } from '../features/management/forms/property-creation-form.js'
import { useLocale } from '../hooks/useLocale.js'

function EditState({ action, description, icon: Icon, title }) {
  return (
    <section
      aria-labelledby="property-edit-state-title"
      className="rounded-2xl border border-line bg-surface px-5 py-14 text-center"
    >
      <Icon aria-hidden="true" className="mx-auto text-muted" size={30} />
      <h2
        className="mt-4 text-xl font-semibold text-ink"
        id="property-edit-state-title"
      >
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-lg leading-7 text-muted">
        {description}
      </p>
      {action}
    </section>
  )
}

export default function PropertyEditPage() {
  const { propertyId } = useParams()
  const { t } = useLocale()
  const { error, property, retry, status } = useManagementProperty(propertyId)
  const initialValues = useMemo(
    () => (property ? toPropertyFormValues(property) : null),
    [property],
  )

  useEffect(() => {
    const previousTitle = document.title
    document.title = `${t('propertyEdit.title')} | ${t('brand.name')}`
    return () => {
      document.title = previousTitle
    }
  }, [t])

  if (error instanceof ApiError && error.status === 403) {
    return <ForbiddenState />
  }

  const notFound = error instanceof ApiError && error.status === 404

  return (
    <section aria-labelledby="property-edit-title">
      {/* The phone wizard carries its own header from the approved design. */}
      <header className="mb-7 hidden border-b border-line pb-6 lg:block">
        <p className="text-sm font-bold uppercase tracking-wide text-accent">
          {t('propertyEdit.eyebrow')}
        </p>
        <h1
          className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl"
          id="property-edit-title"
        >
          {t('propertyEdit.title')}
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-muted">
          {t('propertyEdit.description')}
        </p>
      </header>

      {status ==='loading' && (
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
          <span className="font-semibold">{t('propertyEdit.loading')}</span>
        </div>
      )}

      {status ==='error' && (
        <EditState
          action={
            notFound ? null : (
              <Button className="mt-6" onClick={retry} variant="secondary">
                {t('propertyEdit.retry')}
              </Button>
            )
          }
          description={t(
            notFound
              ? 'propertyEdit.notFoundDescription'
              : 'propertyEdit.errorDescription',
          )}
          icon={AlertCircle}
          title={t(
            notFound
              ? 'propertyEdit.notFoundTitle'
              : 'propertyEdit.errorTitle',
          )}
        />
      )}

      {status ==='ready' && (
        <>
          <p className="mb-6 hidden rounded-xl border border-line bg-surface px-4 py-3 text-sm leading-6 text-muted lg:block">
            {t('propertyEdit.preservedFields')}
          </p>
          <PropertyCreationForm
            initialValues={initialValues}
            mode="edit"
            propertyId={propertyId}
          />
        </>
      )}
    </section>
  )
}
