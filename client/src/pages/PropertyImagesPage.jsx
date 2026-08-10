import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  LoaderCircle,
  Star,
  Trash2,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'

import Button from '../components/ui/Button.jsx'
import { ApiError } from '../api/api-client.js'
import { ForbiddenState } from '../features/auth/components/AuthRouteState.jsx'
import { toManagementPropertyModel } from '../features/management/adapters/to-management-property-model.js'
import {
  deleteImage,
  reorderImages,
  setPrimaryImage,
  uploadImage,
} from '../features/management/api/property-image-api.js'
import { useManagementProperty } from '../features/management/hooks/useManagementProperty.js'
import { useLocale } from '../hooks/useLocale.js'

const acceptedTypes = 'image/jpeg,image/png,image/webp'
const altTextFields = [
  { code: 'en', name: 'altEn' },
  { code: 'ar', name: 'altAr' },
  { code: 'de', name: 'altDe' },
]

// Server-side codes are surfaced as translated copy; the frontend never
// re-implements the upload validation itself.
const errorKeys = {
  IMAGE_LIMIT_REACHED: 'propertyImages.errors.limitReached',
  IMAGE_ORDER_CONFLICT: 'propertyImages.errors.orderConflict',
  IMAGE_TOO_LARGE: 'propertyImages.errors.tooLarge',
  INVALID_IMAGE: 'propertyImages.errors.invalidImage',
  INVALID_IMAGE_TYPE: 'propertyImages.errors.invalidType',
  NETWORK_ERROR: 'propertyImages.errors.network',
  PROPERTY_IMAGE_NOT_FOUND: 'propertyImages.errors.missing',
  UNSAFE_IMAGE_DIMENSIONS: 'propertyImages.errors.invalidImage',
}

function PageState({ action, description, icon: Icon, title }) {
  return (
    <section
      aria-labelledby="property-images-state-title"
      className="rounded-2xl border border-line bg-surface px-5 py-14 text-center"
    >
      <Icon aria-hidden="true" className="mx-auto text-muted" size={30} />
      <h2
        className="mt-4 text-xl font-semibold text-ink"
        id="property-images-state-title"
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

function ImageAction({ children, disabled, icon: Icon, label, onClick }) {
  return (
    <button
      aria-label={label}
      className="inline-flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-ink outline-none transition hover:bg-hover focus-visible:ring-3 focus-visible:ring-focus/35 disabled:cursor-not-allowed disabled:opacity-55"
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      <Icon aria-hidden="true" size={16} />
      {children}
    </button>
  )
}

export default function PropertyImagesPage() {
  const { propertyId } = useParams()
  const { locale, t } = useLocale()
  const { error, property, retry, status } = useManagementProperty(propertyId)
  const [actionErrorKey, setActionErrorKey] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const formRef = useRef(null)

  useEffect(() => {
    const previousTitle = document.title
    document.title = `${t('propertyImages.title')} | ${t('brand.name')}`
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
          'propertyImages.errors.unexpected',
      )
    }
    setIsBusy(false)
    return false
  }

  async function handleUpload(event) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const file = data.get('image')
    if (!file || file.size === 0) {
      setActionErrorKey('propertyImages.errors.fileRequired')
      return
    }

    const uploaded = await run(() =>
      uploadImage(propertyId, file, {
        altAr: data.get('altAr'),
        altDe: data.get('altDe'),
        altEn: data.get('altEn'),
      }),
    )
    if (uploaded) formRef.current?.reset()
  }

  function handleMove(images, index, offset) {
    const imageIds = images.map((image) => image.id)
    const target = index + offset
    ;[imageIds[index], imageIds[target]] = [imageIds[target], imageIds[index]]
    return run(() => reorderImages(propertyId, imageIds))
  }

  function handleDelete(imageId) {
    if (!window.confirm(t('propertyImages.confirmations.delete'))) return
    run(() => deleteImage(propertyId, imageId))
  }

  if (error instanceof ApiError && error.status === 403) {
    return <ForbiddenState />
  }

  const notFound = error instanceof ApiError && error.status === 404
  const images = property?.images ?? []
  const model = property
    ? toManagementPropertyModel(property, locale.code, t)
    : null

  return (
    <section aria-labelledby="property-images-title">
      <header className="mb-7 border-b border-line pb-6">
        <p className="text-sm font-bold uppercase tracking-wide text-accent">
          {t('propertyImages.eyebrow')}
        </p>
        <h1
          className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl"
          id="property-images-title"
        >
          {model ? model.title : t('propertyImages.title')}
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-muted">
          {t('propertyImages.description')}
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
          <span className="font-semibold">{t('propertyImages.loading')}</span>
        </div>
      )}

      {status === 'error' && (
        <PageState
          action={
            notFound ? null : (
              <Button className="mt-6" onClick={retry} variant="secondary">
                {t('propertyImages.retry')}
              </Button>
            )
          }
          description={t(
            notFound
              ? 'propertyImages.notFoundDescription'
              : 'propertyImages.errorDescription',
          )}
          icon={AlertCircle}
          title={t(
            notFound
              ? 'propertyImages.notFoundTitle'
              : 'propertyImages.errorTitle',
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

          <form
            className="rounded-2xl border border-line bg-surface p-5 sm:p-6"
            onSubmit={handleUpload}
            ref={formRef}
          >
            <h2 className="text-lg font-semibold text-ink">
              {t('propertyImages.upload.title')}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              {t('propertyImages.upload.hint')}
            </p>

            <div className="mt-5 grid gap-5">
              <div>
                <label
                  className="mb-1.5 block text-sm font-semibold text-ink"
                  htmlFor="image"
                >
                  {t('propertyImages.upload.fileLabel')}
                </label>
                <input
                  accept={acceptedTypes}
                  className="min-h-12 w-full rounded-xl border border-input-line bg-input px-4 py-2.5 text-ink outline-none focus:border-focus focus:ring-3 focus:ring-focus/20"
                  id="image"
                  name="image"
                  required
                  type="file"
                />
              </div>

              <fieldset className="grid gap-4 sm:grid-cols-3">
                <legend className="mb-1.5 text-sm font-semibold text-ink">
                  {t('propertyImages.upload.altLabel')}
                </legend>
                {altTextFields.map(({ code, name }) => (
                  <div key={name}>
                    <label
                      className="mb-1.5 block text-xs font-semibold text-muted"
                      htmlFor={name}
                    >
                      {t(`languages.${code}`)}
                    </label>
                    <input
                      className="min-h-12 w-full rounded-xl border border-input-line bg-input px-4 text-ink outline-none focus:border-focus focus:ring-3 focus:ring-focus/20"
                      dir={code === 'ar' ? 'rtl' : 'ltr'}
                      id={name}
                      maxLength={500}
                      name={name}
                      type="text"
                    />
                  </div>
                ))}
              </fieldset>
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
                    ? 'propertyImages.upload.submitting'
                    : 'propertyImages.upload.submit',
                )}
              </Button>
            </div>
          </form>

          {images.length === 0 ? (
            <p className="rounded-2xl border border-line bg-surface px-5 py-10 text-center text-muted">
              {t('propertyImages.empty')}
            </p>
          ) : (
            <ul
              aria-label={t('propertyImages.listLabel')}
              className="grid gap-4"
            >
              {images.map((image, index) => (
                <li key={image.id}>
                  <article className="grid gap-4 rounded-2xl border border-line bg-elevated p-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
                    <img
                      alt={image.altEn ?? ''}
                      className="aspect-[4/3] w-full rounded-xl object-cover"
                      height={image.height ?? 720}
                      loading="lazy"
                      src={image.url}
                      width={image.width ?? 960}
                    />
                    <div className="min-w-0">
                      {index === 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-success/35 bg-success/10 px-2.5 py-1 text-xs font-bold text-success">
                          <Star aria-hidden="true" size={13} />
                          {t('propertyImages.primaryBadge')}
                        </span>
                      )}
                      <p className="mt-2 text-sm font-semibold text-muted">
                        {t('propertyImages.position', {
                          position: index + 1,
                          total: images.length,
                        })}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <ImageAction
                          disabled={isBusy || index === 0}
                          icon={Star}
                          label={t('propertyImages.actions.makePrimary')}
                          onClick={() =>
                            run(() => setPrimaryImage(propertyId, image.id))
                          }
                        >
                          {t('propertyImages.actions.makePrimary')}
                        </ImageAction>
                        <ImageAction
                          disabled={isBusy || index === 0}
                          icon={ArrowUp}
                          label={t('propertyImages.actions.moveUp')}
                          onClick={() => handleMove(images, index, -1)}
                        />
                        <ImageAction
                          disabled={isBusy || index === images.length - 1}
                          icon={ArrowDown}
                          label={t('propertyImages.actions.moveDown')}
                          onClick={() => handleMove(images, index, 1)}
                        />
                        <ImageAction
                          disabled={isBusy}
                          icon={Trash2}
                          label={t('propertyImages.actions.delete')}
                          onClick={() => handleDelete(image.id)}
                        >
                          {t('propertyImages.actions.delete')}
                        </ImageAction>
                      </div>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
