import { AlertCircle, LoaderCircle, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'

import Button from '../components/ui/Button.jsx'
import { ApiError } from '../api/api-client.js'
import { ForbiddenState } from '../features/auth/components/AuthRouteState.jsx'
import { toManagementPropertyModel } from '../features/management/adapters/to-management-property-model.js'
import {
  deleteVideo,
  uploadVideo,
} from '../features/management/api/property-video-api.js'
import { useManagementProperty } from '../features/management/hooks/useManagementProperty.js'
import { useLocale } from '../hooks/useLocale.js'

const acceptedTypes =
  'video/mp4,video/webm,video/quicktime,video/x-matroska,video/x-msvideo,video/mpeg'

const sizeUnitKeys = ['bytes', 'kilobytes', 'megabytes', 'gigabytes']

// Server-side codes are surfaced as translated copy; the frontend never
// re-implements the upload validation itself.
const errorKeys = {
  INVALID_VIDEO_TYPE: 'propertyVideo.errors.invalidType',
  NETWORK_ERROR: 'propertyVideo.errors.network',
  VIDEO_ALREADY_EXISTS: 'propertyVideo.errors.alreadyExists',
  VIDEO_NOT_FOUND: 'propertyVideo.errors.missing',
  VIDEO_REQUIRED: 'propertyVideo.errors.fileRequired',
  VIDEO_TOO_LARGE: 'propertyVideo.errors.tooLarge',
}

function formatSize(sizeBytes, localeCode, t) {
  if (typeof sizeBytes !== 'number' || !Number.isFinite(sizeBytes)) return ''

  let value = sizeBytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < sizeUnitKeys.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  const size = new Intl.NumberFormat(localeCode, {
    maximumFractionDigits: unitIndex === 0 || value >= 10 ? 0 : 1,
  }).format(value)
  return t(`propertyVideo.current.units.${sizeUnitKeys[unitIndex]}`, { size })
}

function PageState({ action, description, icon: Icon, title }) {
  return (
    <section
      aria-labelledby="property-video-state-title"
      className="rounded-2xl border border-line bg-surface px-5 py-14 text-center"
    >
      <Icon aria-hidden="true" className="mx-auto text-muted" size={30} />
      <h2
        className="mt-4 text-xl font-semibold text-ink"
        id="property-video-state-title"
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

export default function PropertyVideoPage() {
  const { propertyId } = useParams()
  const { locale, t } = useLocale()
  const { error, property, retry, status } = useManagementProperty(propertyId)
  const [actionErrorKey, setActionErrorKey] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const formRef = useRef(null)

  useEffect(() => {
    const previousTitle = document.title
    document.title = `${t('propertyVideo.title')} | ${t('brand.name')}`
    return () => {
      document.title = previousTitle
    }
  }, [t])

  async function run(action) {
    setActionErrorKey('')
    setIsBusy(true)
    try {
      await action()
      setIsBusy(false)
      retry()
      return true
    } catch (caught) {
      setActionErrorKey(
        (caught instanceof ApiError && errorKeys[caught.code]) ||
          'propertyVideo.errors.unexpected',
      )
    }
    setIsBusy(false)
    return false
  }

  async function handleUpload(event) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const file = data.get('video')
    if (!file || file.size === 0) {
      setActionErrorKey('propertyVideo.errors.fileRequired')
      return
    }

    const uploaded = await run(() => uploadVideo(propertyId, file))
    if (uploaded) formRef.current?.reset()
  }

  function handleDelete() {
    if (!window.confirm(t('propertyVideo.confirmations.delete'))) return
    run(() => deleteVideo(propertyId))
  }

  if (error instanceof ApiError && error.status === 403) {
    return <ForbiddenState />
  }

  const notFound = error instanceof ApiError && error.status === 404
  const videoUrl = property?.videoUrl ?? null
  const model = property
    ? toManagementPropertyModel(property, locale.code, t)
    : null

  return (
    <section aria-labelledby="property-video-title">
      <header className="mb-7 border-b border-line pb-6">
        <p className="text-sm font-bold uppercase tracking-wide text-accent">
          {t('propertyVideo.eyebrow')}
        </p>
        <h1
          className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl"
          id="property-video-title"
        >
          {model ? model.title : t('propertyVideo.title')}
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-muted">
          {t('propertyVideo.description')}
        </p>
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
          <span className="font-semibold">{t('propertyVideo.loading')}</span>
        </div>
      )}

      {status === 'error' && (
        <PageState
          action={
            notFound ? null : (
              <Button className="mt-6" onClick={retry} variant="secondary">
                {t('propertyVideo.retry')}
              </Button>
            )
          }
          description={t(
            notFound
              ? 'propertyVideo.notFoundDescription'
              : 'propertyVideo.errorDescription',
          )}
          icon={AlertCircle}
          title={t(
            notFound
              ? 'propertyVideo.notFoundTitle'
              : 'propertyVideo.errorTitle',
          )}
        />
      )}

      {status === 'ready' && (
        <div className="grid gap-6">
          {actionErrorKey && (
            <p
              aria-live="assertive"
              className="rounded-xl border border-error/35 bg-error/10 px-4 py-3 font-semibold text-ink"
              role="alert"
            >
              {t(actionErrorKey)}
            </p>
          )}

          {videoUrl ? (
            <article className="rounded-2xl border border-line bg-elevated p-4 sm:p-5">
              <h2 className="text-lg font-semibold text-ink">
                {t('propertyVideo.current.title')}
              </h2>
              <video
                className="mt-4 aspect-video w-full rounded-xl bg-black"
                controls
                preload="metadata"
                src={videoUrl}
              >
                {t('propertyVideo.current.unsupported')}
              </video>

              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {t('propertyVideo.current.typeLabel')}
                  </dt>
                  <dd className="mt-1 font-semibold text-ink" dir="ltr">
                    {property.videoMimeType ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {t('propertyVideo.current.sizeLabel')}
                  </dt>
                  <dd className="mt-1 font-semibold text-ink">
                    {property.videoSizeBytes == null
                      ? '—'
                      : formatSize(property.videoSizeBytes, locale.code, t)}
                  </dd>
                </div>
              </dl>

              <div className="mt-5 flex justify-end border-t border-line pt-5">
                <Button
                  disabled={isBusy}
                  onClick={handleDelete}
                  variant="secondary"
                >
                  {isBusy ? (
                    <LoaderCircle
                      aria-hidden="true"
                      className="animate-spin motion-reduce:animate-none"
                      size={18}
                    />
                  ) : (
                    <Trash2 aria-hidden="true" size={18} />
                  )}
                  {t(
                    isBusy
                      ? 'propertyVideo.actions.deleting'
                      : 'propertyVideo.actions.delete',
                  )}
                </Button>
              </div>
            </article>
          ) : (
            <form
              className="rounded-2xl border border-line bg-surface p-5 sm:p-6"
              onSubmit={handleUpload}
              ref={formRef}
            >
              <h2 className="text-lg font-semibold text-ink">
                {t('propertyVideo.upload.title')}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                {t('propertyVideo.upload.hint')}
              </p>

              <div className="mt-5">
                <label
                  className="mb-1.5 block text-sm font-semibold text-ink"
                  htmlFor="video"
                >
                  {t('propertyVideo.upload.fileLabel')}
                </label>
                <input
                  accept={acceptedTypes}
                  className="min-h-12 w-full rounded-xl border border-input-line bg-input px-4 py-2.5 text-ink outline-none focus:border-focus focus:ring-3 focus:ring-focus/20"
                  id="video"
                  name="video"
                  required
                  type="file"
                />
              </div>

              <div className="mt-5 flex justify-end border-t border-line pt-5">
                <Button disabled={isBusy} type="submit">
                  {isBusy && (
                    <LoaderCircle
                      aria-hidden="true"
                      className="animate-spin motion-reduce:animate-none"
                      size={18}
                    />
                  )}
                  {t(
                    isBusy
                      ? 'propertyVideo.upload.submitting'
                      : 'propertyVideo.upload.submit',
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </section>
  )
}
