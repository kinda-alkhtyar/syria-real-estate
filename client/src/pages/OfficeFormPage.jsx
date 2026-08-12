import { ArrowLeft, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { ApiError } from '../api/api-client.js'
import Button from '../components/ui/Button.jsx'
import Container from '../components/ui/Container.jsx'
import DeleteOfficeDialog from '../features/offices/components/DeleteOfficeDialog.jsx'
import OfficeForm from '../features/offices/components/OfficeForm.jsx'
import OfficeDetailsSkeleton from '../features/offices/components/OfficeDetailsSkeleton.jsx'
import OfficesState from '../features/offices/components/OfficesState.jsx'
import {
  createOffice,
  deleteOffice,
  fetchOffice,
  updateOffice,
} from '../features/offices/api/office-api.js'
import {
  officeFormInitialValues,
  toOfficeFormValues,
} from '../features/offices/forms/office-form.js'
import { useLocale } from '../hooks/useLocale.js'

/**
 * Creates an office at `/offices/new` and edits one at `/offices/:officeId/edit`.
 * Both routes are owner-only; the API is the authority on who may write, and a
 * refused PATCH surfaces as a form error rather than a broken page.
 */
export default function OfficeFormPage() {
  const { officeId } = useParams()
  const { locale, t } = useLocale()
  const navigate = useNavigate()
  const mode = officeId ? 'edit' : 'create'
  const [values, setValues] = useState(officeFormInitialValues)
  // 'loading' only applies while an edit prefill is in flight.
  const [status, setStatus] = useState(mode === 'edit' ? 'loading' : 'ready')
  // The stored name, kept apart from `values.name`: the confirmation must name
  // the office that is about to be closed, not whatever is half-typed in the
  // form behind it.
  const [officeName, setOfficeName] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [deletionPending, setDeletionPending] = useState(false)
  const [deletionErrorKey, setDeletionErrorKey] = useState('')

  useEffect(() => {
    if (mode !== 'edit') return undefined
    const controller = new AbortController()

    fetchOffice(officeId, { signal: controller.signal })
      .then((response) => {
        const prefill = toOfficeFormValues(response.data, locale.code)
        setValues(prefill)
        setOfficeName(prefill.name)
        setStatus('ready')
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setStatus('error')
      })

    return () => controller.abort()
    // The prefill reads the locale active when the page opened. Re-running it
    // on a language switch would discard whatever the owner has typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, officeId])

  async function handleSubmit(payload) {
    const office =
      mode === 'create'
        ? await createOffice(payload)
        : await updateOffice(officeId, payload)

    navigate(`/offices/${office.id}`, { replace: true })
  }

  // The office detail page it came from no longer exists, so the only sensible
  // destination is the public list — where `MyOfficePanel` offers to create one
  // again, because /offices/mine now answers 404.
  async function handleDelete() {
    setDeletionErrorKey('')
    setDeletionPending(true)
    try {
      await deleteOffice(officeId)
      navigate('/offices', { replace: true })
      return
    } catch (error) {
      setDeletionErrorKey(
        error instanceof ApiError && error.code === 'NETWORK_ERROR'
          ? 'officeForm.delete.feedback.network'
          : 'officeForm.delete.feedback.unexpected',
      )
    }
    setDeletionPending(false)
  }

  const backTo = mode === 'edit' ? `/offices/${officeId}` : '/offices'

  return (
    <section className="bg-canvas pb-12 pt-4 sm:py-14 lg:py-16">
      <Container>
        <Link
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted outline-none transition-colors duration-standard ease-standard hover:text-ink focus-visible:ring-3 focus-visible:ring-focus/35 motion-reduce:transition-none"
          to={backTo}
        >
          <ArrowLeft aria-hidden="true" className="rtl:-scale-x-100" size={18} />
          {t('officeForm.actions.cancel')}
        </Link>

        <div className="mt-4 max-w-2xl">
          {status === 'loading' && <OfficeDetailsSkeleton />}
          {status === 'error' && <OfficesState type="error" />}
          {status === 'ready' && (
            <>
              <h1 className="text-xl font-semibold text-ink sm:text-2xl">
                {t(
                  mode === 'create'
                    ? 'officeForm.createTitle'
                    : 'officeForm.editTitle',
                )}
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted">
                {t(
                  mode === 'create'
                    ? 'officeForm.createDescription'
                    : 'officeForm.editDescription',
                )}
              </p>
              <OfficeForm
                mode={mode}
                onCancel={() => navigate(backTo)}
                onSubmit={handleSubmit}
                onValuesChange={setValues}
                values={values}
              />

              {/* Separated from the form by a rule and a wide gap: closing the
                  office is not one more field to fill in on the way to saving. */}
              {mode === 'edit' && (
                <section
                  aria-labelledby="office-danger-zone-title"
                  className="mt-12 border-t border-line pt-8"
                >
                  <h2
                    className="text-base font-semibold text-ink"
                    id="office-danger-zone-title"
                  >
                    {t('officeForm.delete.zoneTitle')}
                  </h2>
                  <p className="mt-1.5 text-sm leading-6 text-muted">
                    {t('officeForm.delete.zoneDescription')}
                  </p>
                  <Button
                    className="mt-4"
                    onClick={() => {
                      setDeletionErrorKey('')
                      setIsDeleting(true)
                    }}
                    variant="danger"
                  >
                    <Trash2 aria-hidden="true" size={16} />
                    {t('officeForm.delete.action')}
                  </Button>
                </section>
              )}
            </>
          )}
        </div>
      </Container>

      {isDeleting && (
        <DeleteOfficeDialog
          errorMessage={deletionErrorKey ? t(deletionErrorKey) : ''}
          officeName={officeName}
          onCancel={() => {
            setIsDeleting(false)
            setDeletionErrorKey('')
          }}
          onConfirm={handleDelete}
          pending={deletionPending}
        />
      )}
    </section>
  )
}
