import {
  ChevronLeft,
  Clapperboard,
  Crosshair,
  Clock,
  Images,
  LoaderCircle,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import Button from '../../../components/ui/Button.jsx'
import { ApiError } from '../../../api/api-client.js'
import { syrianGovernorates } from '../../../constants/syrian-governorates.js'
import { useAuth } from '../../auth/hooks/useAuth.js'
import { useLocale } from '../../../hooks/useLocale.js'
import {
  pendingReviewFilter,
  writableStatusesFor,
} from '../constants/listing-status-presentation.js'
import { formatCurrency } from '../../properties/utils/property-formatters.js'
import { updateProperty } from '../api/management-property-api.js'
import { createProperty } from '../api/property-creation-api.js'
import {
  createSubmissionGate,
  descriptionFieldForLocale,
  getPropertyCreationSuccessPath,
  isPropertyCreationDirty,
  needsCountryCode,
  parsePropertyCreationErrors,
  propertyCreationInitialValues,
  propertyCreationOptions,
  shouldWarnUnsavedChanges,
  titleFieldForLocale,
  toPropertyCreationPayload,
  validatePropertyCreation,
} from '../forms/property-creation-form.js'

// Writing direction and field suffix per interface language. The form writes
// only the language being browsed, so this is a lookup, not a tab list.
const languages = [
  { code: 'en', direction: 'ltr', suffix: 'En' },
  { code: 'ar', direction: 'rtl', suffix: 'Ar' },
  { code: 'de', direction: 'ltr', suffix: 'De' },
]

const governorateLabels = Object.fromEntries(
  syrianGovernorates.map(({ id, labelKey }) => [
    id.replaceAll('-', '_'),
    labelKey,
  ]),
)

// Owner phones walk a nine-step wizard from the approved mobile design. From
// `lg` upwards the desktop form renders instead, with every section expanded.
const desktopQuery = '(min-width: 64rem)'

/**
 * The nine phone steps, in screen order. This is purely a presentation
 * regrouping of the existing fields: validation, the payload builder, and the
 * desktop sections below are untouched.
 */
const wizardSteps = [
  { fields: ['propertyType', 'transaction', 'status', 'featured'], id: 'listing' },
  {
    fields: ['governorate', 'city', 'neighborhood', 'address'],
    id: 'location',
  },
  { fields: ['latitude', 'longitude'], id: 'map' },
  { fields: ['titleEn', 'titleAr', 'titleDe'], id: 'title' },
  {
    fields: ['descriptionEn', 'descriptionAr', 'descriptionDe'],
    id: 'description',
  },
  { fields: ['area', 'bedrooms', 'bathrooms'], id: 'specs' },
  { fields: ['price', 'currency', 'whatsapp'], id: 'price' },
  { fields: [], id: 'media' },
  { fields: [], id: 'review' },
]

const reviewStep = wizardSteps.length - 1

/** Punctuation, not copy — keeps the review rows readable in RTL and LTR. */
const factSeparator = ' · '

function stepOfField(field) {
  const index = wizardSteps.findIndex((step) => step.fields.includes(field))
  return index === -1 ? undefined : index
}

function FieldError({ id, message }) {
  if (!message) return null
  return (
    <p className="mt-1.5 text-sm font-semibold text-error" id={id}>
      {message}
    </p>
  )
}

// Hides the native increment/decrement arrows while leaving typing, min, max,
// step and the submitted value untouched.
const spinnerFreeClasses =
  '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'

function FormField({
  error,
  hint,
  label,
  multiline = false,
  name,
  onChange,
  required = false,
  type,
  value,
  ...props
}) {
  const errorId = `${name}-error`
  const hintId = `${name}-hint`
  const describedBy = [hint ? hintId : '', error ? errorId : '']
    .filter(Boolean)
    .join(' ')
  const Input = multiline ? 'textarea' : 'input'
  return (
    <div className="min-w-0">
      <label className="mb-1.5 block text-sm font-semibold text-ink" htmlFor={name}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <Input
        aria-describedby={describedBy || undefined}
        aria-invalid={Boolean(error)}
        className={`w-full rounded-xl border bg-input px-4 py-3 text-ink outline-none transition focus:border-focus focus:ring-3 focus:ring-focus/20 ${
          multiline ? 'min-h-32 resize-y' : 'min-h-12'
        } ${error ? 'border-error' : 'border-input-line'} ${
          type === 'number' ? spinnerFreeClasses : ''
        }`}
        id={name}
        name={name}
        onChange={onChange}
        type={type}
        value={value}
        {...props}
      />
      {hint && (
        <p className="mt-1.5 text-xs leading-5 text-muted" id={hintId}>
          {hint}
        </p>
      )}
      <FieldError id={errorId} message={error} />
    </div>
  )
}

/**
 * Groups fields under a heading that collapses on phones and stays open from the
 * `sm` breakpoint upwards, so no field is ever hidden on a wider screen.
 */
function FormSection({ children, className = '', expanded, id, isDesktop, title }) {
  const panelId = `property-form-panel-${id}`

  return (
    <fieldset
      className={`rounded-2xl border border-line bg-surface p-5 sm:p-6 ${className}`}
    >
      <legend className="w-full px-2 text-lg font-semibold text-ink lg:w-auto">
        {title}
      </legend>
      {/* The 0fr → 1fr row animates smoothly without measuring the panel, which
          keeps the height correct while fields grow error and hint text. */}
      <div
        className={`grid transition-[grid-template-rows] duration-standard ease-standard motion-reduce:transition-none lg:block ${
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div
          className="overflow-hidden lg:overflow-visible"
          id={panelId}
          inert={!isDesktop && !expanded}
        >
          {children}
        </div>
      </div>
    </fieldset>
  )
}

function FormSelect({
  children,
  error,
  label,
  name,
  onChange,
  required = false,
  value,
}) {
  const errorId = `${name}-error`
  return (
    <div className="min-w-0">
      <label className="mb-1.5 block text-sm font-semibold text-ink" htmlFor={name}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <select
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        className={`min-h-12 w-full rounded-xl border bg-input px-4 py-2 text-ink outline-none focus:border-focus focus:ring-3 focus:ring-focus/20 ${
          error ? 'border-error' : 'border-input-line'
        }`}
        id={name}
        name={name}
        onChange={onChange}
        value={value}
      >
        {children}
      </select>
      <FieldError id={errorId} message={error} />
    </div>
  )
}

/** Label / value line of the phone review card (screen 4b). */
function ReviewRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[10px] bg-home-panel px-3.5 py-3">
      <span className="shrink-0 text-xs font-semibold text-home-muted">
        {label}
      </span>
      <span className="min-w-0 text-end text-xs font-bold text-home-heading">
        {value}
      </span>
    </div>
  )
}

export default function PropertyCreationForm({
  initialValues = propertyCreationInitialValues,
  mode = 'create',
  propertyId = '',
}) {
  const isEditing = mode === 'edit'
  const [errors, setErrors] = useState({})
  const [formErrorKey, setFormErrorKey] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [locationStatus, setLocationStatus] = useState('idle')
  // Phones walk the same fields as a wizard, one step at a time.
  const [step, setStep] = useState(0)
  // Read synchronously so a desktop first paint never shows collapsed sections.
  const [isDesktop, setIsDesktop] = useState(
    () => window.matchMedia(desktopQuery).matches,
  )
  const [succeeded, setSucceeded] = useState(false)
  const [submittedForReview, setSubmittedForReview] = useState(false)
  const [values, setValues] = useState({ ...initialValues })
  const submissionGate = useRef(createSubmissionGate())
  const navigate = useNavigate()
  const { locale, t } = useLocale()
  const { user } = useAuth()
  const isAdministrator = user?.role === 'ADMIN'
  const statusOptions = writableStatusesFor(user?.role)
  const initialStatus = initialValues.status
  // Only the language being browsed is written here, so the form shows a single
  // title and a single description and validates those two fields. The payload
  // builder copies the title into the other two languages the API requires.
  const contentLanguage =
    languages.find((language) => language.code === locale.code) ?? languages[0]
  const titleField =
    titleFieldForLocale(locale.code) || `title${contentLanguage.suffix}`
  const descriptionField =
    descriptionFieldForLocale(locale.code) ||
    `description${contentLanguage.suffix}`
  const dirty = useMemo(
    () => isPropertyCreationDirty(values, initialValues),
    [initialValues, values],
  )
  const warnUnsaved = shouldWarnUnsavedChanges({
    dirty,
    submitting: isSubmitting,
    succeeded,
  })

  useEffect(() => {
    const query = window.matchMedia(desktopQuery)
    function handleChange(event) {
      setIsDesktop(event.matches)
    }
    query.addEventListener('change', handleChange)
    return () => query.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    function handleBeforeUnload(event) {
      if (!warnUnsaved) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [warnUnsaved])

  useEffect(() => {
    if (!warnUnsaved) return undefined

    function handleLinkNavigation(event) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }
      const link = event.target.closest?.('a[href]')
      if (!link || link.target === '_blank' || link.hasAttribute('download')) {
        return
      }
      const destination = new URL(link.href, window.location.href)
      if (destination.href === window.location.href) return
      if (!window.confirm(t('propertyCreate.leaveConfirmation'))) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    document.addEventListener('click', handleLinkNavigation, true)
    return () => document.removeEventListener('click', handleLinkNavigation, true)
  }, [t, warnUnsaved])

  function errorMessage(field) {
    const error = errors[field]
    if (!error) return ''
    const translated = t(`propertyCreate.validation.${error}`)
    return translated === `propertyCreate.validation.${error}`
      ? error
      : translated
  }

  function handleChange(event) {
    const { checked, name, type, value } = event.target
    setValues((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
    setErrors((current) => {
      if (!current[name]) return current
      const next = { ...current }
      delete next[name]
      return next
    })
    setFormErrorKey('')
  }

  function focusFirstError(nextErrors) {
    const firstField = Object.keys(nextErrors)[0]
    // An off-step field would otherwise stay hidden from both the owner and the
    // focus call below, so the wizard jumps to the first step that holds one.
    const invalidSteps = Object.keys(nextErrors)
      .map(stepOfField)
      .filter((index) => index !== undefined)
    if (invalidSteps.length > 0) setStep(Math.min(...invalidSteps))
    window.setTimeout(() => {
      document.getElementById(firstField)?.focus()
    })
  }

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setLocationStatus('unsupported')
      return
    }
    setLocationStatus('locating')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setValues((current) => ({
          ...current,
          latitude: position.coords.latitude.toFixed(5),
          longitude: position.coords.longitude.toFixed(5),
        }))
        setErrors((current) => {
          const next = { ...current }
          delete next.latitude
          delete next.longitude
          return next
        })
        setLocationStatus('idle')
      },
      () => setLocationStatus('denied'),
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 10000 },
    )
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!submissionGate.current.tryStart()) return

    // While editing, a blank description keeps the stored text: it is omitted
    // from the PATCH rather than demanded from the owner.
    const nextErrors = validatePropertyCreation(values, {
      localeCode: locale.code,
      requireDescription: !isEditing,
    })
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      focusFirstError(nextErrors)
      submissionGate.current.finish()
      return
    }

    setIsSubmitting(true)
    setErrors({})
    setFormErrorKey('')
    try {
      // `featured` is never sent while editing: the management endpoint does
      // not return it, so submitting a value would overwrite the stored flag
      // with a default the administrator never saw.
      // The title is copied into the other two languages on create only. While
      // editing they are already prefilled from the record and travel back
      // unchanged, so an owner fixing a price never rewrites a translation.
      const payload = toPropertyCreationPayload(values, {
        copyActiveTitle: !isEditing,
        includeFeatured: isAdministrator && !isEditing,
        // An owner never chooses the status of a new listing: submitting is
        // what puts it into review. While editing, the status travels only when
        // it was actually changed to one the role may write — an untouched
        // field is what lets the server resubmit a rejected listing.
        includeStatus:
          (isEditing || isAdministrator) &&
          values.status !== initialStatus &&
          statusOptions.includes(values.status),
        localeCode: locale.code,
      })
      const saved = isEditing
        ? await updateProperty(propertyId, payload)
        : await createProperty(payload)
      setSucceeded(true)
      // The server decides: a submission and a resubmitted rejection both come
      // back as PENDING_REVIEW, and both deserve the same explanation instead
      // of a bare "saved" banner.
      if (saved?.status === pendingReviewFilter) {
        setSubmittedForReview(true)
        return
      }
      navigate(getPropertyCreationSuccessPath(), {
        replace: true,
        state: isEditing
          ? { propertyUpdated: true }
          : { propertyCreated: true },
      })
    } catch (error) {
      if (error instanceof ApiError && error.code === 'INVALID_REQUEST') {
        const serverErrors = parsePropertyCreationErrors(error.message)
        setErrors(serverErrors)
        setFormErrorKey(
          Object.keys(serverErrors).length === 0
            ? 'propertyCreate.feedback.validation'
            : '',
        )
        focusFirstError(serverErrors)
      } else if (
        error instanceof ApiError &&
        error.code === 'NETWORK_ERROR'
      ) {
        setFormErrorKey('propertyCreate.feedback.network')
      } else {
        setFormErrorKey(
          isEditing
            ? 'propertyEdit.feedback.unexpected'
            : 'propertyCreate.feedback.unexpected',
        )
      }
    } finally {
      setIsSubmitting(false)
      submissionGate.current.finish()
    }
  }

  /** e.g. «العنوان (العربية)» — names the language the field is written in. */
  function localizedFieldLabel(fieldKey, code) {
    return t('propertyCreate.localizedField', {
      field: t(`propertyCreate.fields.${fieldKey}`),
      language: t(`languages.${code}`),
    })
  }

  function leaveWizard() {
    if (
      !warnUnsaved ||
      window.confirm(t('propertyCreate.leaveConfirmation'))
    ) {
      navigate('/dashboard')
    }
  }

  // Hidden while an owner creates a listing: the status is not part of that
  // payload, so offering the choice would promise something the submission
  // cannot keep.
  //
  // A listing under moderation shows its state as a disabled option, selected
  // and unreachable: `pending_review` and `rejected` are the server's to set,
  // and leaving the field alone is what lets an owner's edit resubmit.
  const statusSelect = (isEditing || isAdministrator) && (
    <FormSelect
      label={t('propertyCreate.fields.status')}
      name="status"
      onChange={handleChange}
      value={values.status}
    >
      {!statusOptions.includes(initialStatus) && (
        <option disabled value={initialStatus}>
          {t(`listingStatuses.${initialStatus}`)}
        </option>
      )}
      {statusOptions.map((status) => (
        <option key={status} value={status}>
          {t(`listingStatuses.${status}`)}
        </option>
      ))}
    </FormSelect>
  )

  const transactionSelect = (
    <FormSelect
      label={t('propertyCreate.fields.transaction')}
      name="transaction"
      onChange={handleChange}
      value={values.transaction}
    >
      {propertyCreationOptions.transactions.map((transaction) => (
        <option key={transaction} value={transaction}>
          {t(
            `transactionTypes.${transaction === 'stay' ? 'stays' : transaction}`,
          )}
        </option>
      ))}
    </FormSelect>
  )

  const propertyTypeSelect = (
    <FormSelect
      label={t('propertyCreate.fields.propertyType')}
      name="propertyType"
      onChange={handleChange}
      value={values.propertyType}
    >
      {propertyCreationOptions.propertyTypes.map((type) => (
        <option key={type} value={type}>
          {t(`propertyTypes.${type}`)}
        </option>
      ))}
    </FormSelect>
  )

  const featuredCheckbox = isAdministrator && !isEditing && (
    <label className="flex min-h-12 items-center gap-3 self-end rounded-xl border border-input-line bg-input px-4 text-sm font-semibold text-ink">
      <input
        checked={values.featured}
        className="size-4 accent-action"
        name="featured"
        onChange={handleChange}
        type="checkbox"
      />
      {t('propertyCreate.fields.featured')}
    </label>
  )

  const governorateSelect = (
    <FormSelect
      label={t('propertyCreate.fields.governorate')}
      name="governorate"
      onChange={handleChange}
      required
      value={values.governorate}
    >
      {propertyCreationOptions.governorates.map((governorate) => (
        <option key={governorate} value={governorate}>
          {t(governorateLabels[governorate])}
        </option>
      ))}
    </FormSelect>
  )

  // `district` is deliberately absent: an owner names the neighbourhood, and the
  // stored value of a legacy listing travels back untouched through the payload
  // builder rather than being cleared by a field nobody fills in any more.
  const addressFields = ['city', 'neighborhood', 'address'].map((field) => (
    <FormField
      error={errorMessage(field)}
      key={field}
      label={t(`propertyCreate.fields.${field}`)}
      maxLength={field === 'address' ? 500 : 120}
      name={field}
      onChange={handleChange}
      required={field !== 'address'}
      value={values[field]}
    />
  ))

  const coordinateFields = (
    <>
      <FormField
        error={errorMessage('latitude')}
        hint={t('propertyCreate.hints.latitude')}
        inputMode="decimal"
        label={t('propertyCreate.fields.latitude')}
        name="latitude"
        onChange={handleChange}
        placeholder={t('propertyCreate.placeholders.latitude')}
        step="any"
        type="number"
        value={values.latitude}
      />
      <FormField
        error={errorMessage('longitude')}
        hint={t('propertyCreate.hints.longitude')}
        inputMode="decimal"
        label={t('propertyCreate.fields.longitude')}
        name="longitude"
        onChange={handleChange}
        placeholder={t('propertyCreate.placeholders.longitude')}
        step="any"
        type="number"
        value={values.longitude}
      />
      <div className="min-w-0">
        <Button
          disabled={locationStatus === 'locating'}
          onClick={handleUseMyLocation}
          variant="secondary"
        >
          {locationStatus === 'locating' ? (
            <LoaderCircle
              aria-hidden="true"
              className="animate-spin motion-reduce:animate-none"
              size={16}
            />
          ) : (
            <Crosshair aria-hidden="true" size={16} />
          )}
          {t(
            `propertyCreate.actions.${
              locationStatus === 'locating' ? 'locating' : 'useMyLocation'
            }`,
          )}
        </Button>
        {(locationStatus === 'denied' ||
          locationStatus === 'unsupported') && (
          <p
            aria-live="polite"
            className="mt-1.5 text-sm font-semibold text-error"
          >
            {t(`propertyCreate.feedback.location.${locationStatus}`)}
          </p>
        )}
      </div>
    </>
  )

  const priceField = (
    <FormField
      error={errorMessage('price')}
      inputMode="decimal"
      label={t('propertyCreate.fields.price')}
      min="0"
      name="price"
      onChange={handleChange}
      required
      step="any"
      type="number"
      value={values.price}
    />
  )

  const currencySelect = (
    <FormSelect
      label={t('propertyCreate.fields.currency')}
      name="currency"
      onChange={handleChange}
      value={values.currency}
    >
      {propertyCreationOptions.currencies.map((currency) => (
        <option key={currency} value={currency}>
          {currency.toUpperCase()}
        </option>
      ))}
    </FormSelect>
  )

  // The hint doubles as a live nudge: as soon as a number is typed without a
  // country code it explains why WhatsApp would not reach the seller.
  const whatsappField = (
    <FormField
      autoComplete="tel"
      error={errorMessage('whatsapp')}
      hint={t(
        needsCountryCode(values.whatsapp)
          ? 'propertyCreate.hints.whatsappCountryCode'
          : 'propertyCreate.hints.whatsapp',
      )}
      inputMode="tel"
      label={t('propertyCreate.fields.whatsapp')}
      maxLength={28}
      name="whatsapp"
      onChange={handleChange}
      placeholder={t('propertyCreate.placeholders.whatsapp')}
      type="tel"
      value={values.whatsapp}
    />
  )

  const areaField = (
    <FormField
      error={errorMessage('area')}
      inputMode="decimal"
      label={t('propertyCreate.fields.area')}
      min="0"
      name="area"
      onChange={handleChange}
      required
      step="any"
      type="number"
      value={values.area}
    />
  )

  const roomFields = ['bedrooms', 'bathrooms'].map((field) => (
    <FormField
      error={errorMessage(field)}
      inputMode="numeric"
      key={field}
      label={t(`propertyCreate.fields.${field}`)}
      max="100"
      min="0"
      name={field}
      onChange={handleChange}
      type="number"
      value={values[field]}
    />
  ))

  const mediaBlock = isEditing ? (
    // Images and video keep their own dedicated screens; this section only
    // routes to them so every media entry point sits with the form.
    <div className="grid gap-3 sm:grid-cols-2">
      <Link
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line bg-action-secondary px-4 text-sm font-semibold text-ink outline-none transition duration-standard ease-standard hover:bg-hover focus-visible:ring-3 focus-visible:ring-focus/35 motion-reduce:transition-none"
        to={`/dashboard/properties/${propertyId}/images`}
      >
        <Images aria-hidden="true" size={18} />
        {t('propertyCreate.media.images')}
      </Link>
      <Link
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line bg-action-secondary px-4 text-sm font-semibold text-ink outline-none transition duration-standard ease-standard hover:bg-hover focus-visible:ring-3 focus-visible:ring-focus/35 motion-reduce:transition-none"
        to={`/dashboard/properties/${propertyId}/video`}
      >
        <Clapperboard aria-hidden="true" size={18} />
        {t('propertyCreate.media.video')}
      </Link>
    </div>
  ) : (
    <p className="text-sm leading-6 text-muted">
      {t('propertyCreate.media.createHint')}
    </p>
  )

  const formErrorNotice = formErrorKey && (
    <p
      aria-live="assertive"
      className="rounded-xl border border-error/35 bg-error/10 px-4 py-3 font-semibold text-ink"
      role="alert"
    >
      {t(formErrorKey)}
    </p>
  )

  const submitLabel = t(
    `${isEditing ? 'propertyEdit' : 'propertyCreate'}.actions.${
      isSubmitting ? 'submitting' : 'submit'
    }`,
  )

  // Replaces the whole form, phone wizard included: the listing is saved, so
  // there is nothing left to fill in — only the outcome to explain.
  if (submittedForReview) {
    return (
      <section
        aria-labelledby="property-submitted-title"
        className="rounded-2xl border border-line bg-surface px-5 py-14 text-center"
      >
        <Clock aria-hidden="true" className="mx-auto text-warning" size={34} />
        <h2
          className="mt-4 text-2xl font-bold text-ink"
          id="property-submitted-title"
        >
          {t('propertyCreate.submitted.title')}
        </h2>
        <p className="mx-auto mt-3 max-w-lg leading-7 text-muted">
          {t('propertyCreate.submitted.description')}
        </p>
        <div className="mt-7 flex flex-col items-center gap-3">
          <Button onClick={() => navigate('/dashboard')}>
            {t('propertyCreate.submitted.action')}
          </Button>
        </div>
      </section>
    )
  }

  if (!isDesktop) {
    const currentStep = wizardSteps[step]
    const isReview = step === reviewStep

    /** Off-step content stays mounted so typed values survive navigation. */
    const panelClassName = (id) =>
      currentStep.id === id ? 'grid gap-5' : 'hidden'

    const reviewType = [
      t(`propertyTypes.${values.propertyType}`),
      t(
        `transactionTypes.${
          values.transaction === 'stay' ? 'stays' : values.transaction
        }`,
      ),
    ].join(factSeparator)

    const reviewDetails =
      [
        values.bedrooms &&
          `${values.bedrooms} ${t('propertyFacts.bedrooms')}`,
        values.bathrooms &&
          `${values.bathrooms} ${t('propertyFacts.bathrooms')}`,
        values.area && t('propertyFacts.areaValue', { value: values.area }),
      ]
        .filter(Boolean)
        .join(factSeparator) || '—'

    const reviewLocation =
      [values.city, t(governorateLabels[values.governorate])]
        .filter(Boolean)
        .join(factSeparator) || '—'

    const reviewTitle =
      values.titleAr ||
      values.titleEn ||
      values.titleDe ||
      t('propertyCreate.review.untitled')

    const priceAmount = Number(values.price)
    const reviewPrice = Number.isFinite(priceAmount) && values.price !== ''
      ? formatCurrency(
          priceAmount,
          values.currency.toUpperCase(),
          locale.code,
        )
      : t('propertyCreate.review.noPrice')

    return (
      <form
        // Fills the viewport minus the fixed bottom bar, so the wizard footer
        // rests directly above it instead of forcing a short extra scroll.
        className="flex min-h-[calc(100svh-4.5rem-env(safe-area-inset-bottom))] flex-col bg-home-panel"
        noValidate
        onSubmit={handleSubmit}
      >
        <header className="shrink-0 border-b border-home-card-border px-4 pb-3.5 pt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <button
              aria-label={t('accessibility.goBack')}
              className="-ms-1 inline-flex size-9 shrink-0 items-center justify-center rounded-full text-home-heading outline-none focus-visible:ring-3 focus-visible:ring-focus/35"
              onClick={() =>
                step > 0 ? setStep((current) => current - 1) : leaveWizard()
              }
              type="button"
            >
              <ChevronLeft
                aria-hidden="true"
                className="rtl:-scale-x-100"
                size={18}
              />
            </button>
            <span className="text-[13px] font-bold text-home-heading">
              {t(`${isEditing ? 'propertyEdit' : 'propertyCreate'}.title`)}
            </span>
            <span className="shrink-0 text-xs font-semibold text-home-muted">
              {t('propertyCreate.stepCounter', {
                current: step + 1,
                total: wizardSteps.length,
              })}
            </span>
          </div>
          <ol
            aria-label={t('propertyCreate.stepProgress')}
            className="flex gap-1"
          >
            {wizardSteps.map((wizardStep, index) => (
              <li
                aria-current={index === step ? 'step' : undefined}
                className={`h-1 flex-1 rounded-full ${
                  index <= step ? 'bg-home-gold' : 'bg-home-card-border'
                }`}
                key={wizardStep.id}
              >
                <span className="sr-only">
                  {t(`propertyCreate.steps.${wizardStep.id}.title`)}
                </span>
              </li>
            ))}
          </ol>
        </header>

        <div
          className={`flex-1 px-4 py-5 ${isReview ? 'bg-home-section' : ''}`}
        >
          <h2 className="text-lg font-extrabold leading-tight text-home-heading">
            {t(`propertyCreate.steps.${currentStep.id}.title`)}
          </h2>
          <p className="mb-5 mt-1 text-[12.5px] leading-5 text-home-muted">
            {t(`propertyCreate.steps.${currentStep.id}.description`)}
          </p>

          {warnUnsaved && (
            <p
              aria-live="polite"
              className="mb-4 rounded-xl border border-warning/35 bg-warning/10 px-4 py-3 text-sm font-semibold text-ink"
              role="status"
            >
              {t('propertyCreate.unsavedWarning')}
            </p>
          )}

          <div className={panelClassName('listing')}>
            {propertyTypeSelect}
            {transactionSelect}
            {statusSelect}
            {featuredCheckbox}
          </div>

          <div className={panelClassName('location')}>
            {governorateSelect}
            {addressFields}
          </div>

          <div className={panelClassName('map')}>{coordinateFields}</div>

          {/* One title in the language being browsed, labelled with it so the
              owner always knows which language they are writing. */}
          <div className={panelClassName('title')}>
            <div dir={contentLanguage.direction}>
              <FormField
                error={errorMessage(titleField)}
                label={localizedFieldLabel('title', contentLanguage.code)}
                maxLength={200}
                name={titleField}
                onChange={handleChange}
                required
                value={values[titleField]}
              />
            </div>
          </div>

          <div className={panelClassName('description')}>
            <div dir={contentLanguage.direction}>
              <FormField
                error={errorMessage(descriptionField)}
                label={localizedFieldLabel('description', contentLanguage.code)}
                maxLength={20000}
                multiline
                name={descriptionField}
                onChange={handleChange}
                required={!isEditing}
                value={values[descriptionField]}
              />
            </div>
          </div>

          <div className={panelClassName('specs')}>
            {areaField}
            {roomFields}
          </div>

          <div className={panelClassName('price')}>
            {priceField}
            {currencySelect}
            {whatsappField}
          </div>

          <div className={panelClassName('media')}>{mediaBlock}</div>

          <div className={isReview ? 'grid gap-3.5' : 'hidden'}>
            <div className="overflow-hidden rounded-[16px] border border-home-card-border bg-home-panel">
              {/* Listings carry no photo until the media screens run, so the
                  cover is a labelled placeholder rather than a fake image. */}
              <div className="flex h-[130px] items-center justify-center bg-home-section text-[11px] text-home-muted">
                {t('propertyCreate.review.cover')}
              </div>
              <div className="p-3">
                <p className="text-sm font-extrabold text-home-gold">
                  {reviewPrice}
                </p>
                <p className="mt-1 text-[13px] font-bold text-home-heading">
                  {reviewTitle}
                </p>
                <p className="mt-1 text-[11.5px] text-home-muted">
                  {reviewLocation}
                </p>
              </div>
            </div>
            <ReviewRow
              label={t('propertyCreate.review.type')}
              value={reviewType}
            />
            <ReviewRow
              label={t('propertyCreate.review.details')}
              value={reviewDetails}
            />
            <ReviewRow
              label={t('propertyCreate.review.location')}
              value={reviewLocation}
            />
          </div>

          {formErrorNotice}
        </div>

        {/* The safe area is already reserved by the layout for the bottom bar,
            so this footer only needs its own breathing room. */}
        <div className="flex shrink-0 gap-2.5 border-t border-home-card-border bg-home-panel px-4 pb-5 pt-3.5">
          <button
            className="min-h-12 flex-1 rounded-[12px] border border-home-card-border px-2 text-[13px] font-bold text-home-heading outline-none transition-colors duration-fast ease-standard focus-visible:ring-3 focus-visible:ring-focus/35 disabled:opacity-60 motion-reduce:transition-none"
            disabled={isSubmitting}
            onClick={() =>
              step > 0 ? setStep((current) => current - 1) : leaveWizard()
            }
            type="button"
          >
            {t(
              `propertyCreate.actions.${
                isReview ? 'edit' : step > 0 ? 'previous' : 'cancel'
              }`,
            )}
          </button>
          {isReview ? (
            <button
              className="inline-flex min-h-12 flex-[2] items-center justify-center gap-2 rounded-[12px] bg-home-gold px-2 text-[13px] font-extrabold text-home-on-gold outline-none transition-colors duration-fast ease-standard focus-visible:ring-3 focus-visible:ring-focus/35 disabled:opacity-60 motion-reduce:transition-none"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting && (
                <LoaderCircle
                  aria-hidden="true"
                  className="animate-spin motion-reduce:animate-none"
                  size={18}
                />
              )}
              {isSubmitting
                ? submitLabel
                : t('propertyCreate.actions.publish')}
            </button>
          ) : (
            <button
              className="min-h-12 flex-[2] rounded-[12px] bg-home-band px-2 text-[13px] font-extrabold text-home-band-text outline-none transition-colors duration-fast ease-standard focus-visible:ring-3 focus-visible:ring-focus/35 motion-reduce:transition-none"
              onClick={() => setStep((current) => current + 1)}
              type="button"
            >
              {t('propertyCreate.actions.next')}
            </button>
          )}
        </div>
      </form>
    )
  }

  return (
    <form className="grid gap-6" noValidate onSubmit={handleSubmit}>
      {warnUnsaved && (
        <p
          aria-live="polite"
          className="rounded-xl border border-warning/35 bg-warning/10 px-4 py-3 text-sm font-semibold text-ink"
          role="status"
        >
          {t('propertyCreate.unsavedWarning')}
        </p>
      )}

      <FormSection
        expanded
        id="titleLocation"
        isDesktop
        title={t('propertyCreate.sections.titleLocation')}
      >
        {/* Title and description are written once, in the language being
            browsed, so there are no language tabs to switch between. */}
        <div className="grid gap-5" dir={contentLanguage.direction}>
          <FormField
            error={errorMessage(titleField)}
            label={localizedFieldLabel('title', contentLanguage.code)}
            maxLength={200}
            name={titleField}
            onChange={handleChange}
            required
            value={values[titleField]}
          />
          <FormField
            error={errorMessage(descriptionField)}
            label={localizedFieldLabel('description', contentLanguage.code)}
            maxLength={20000}
            multiline
            name={descriptionField}
            onChange={handleChange}
            required={!isEditing}
            value={values[descriptionField]}
          />
        </div>

        <div className="mt-6 grid gap-5 border-t border-line pt-6 sm:grid-cols-2">
          {governorateSelect}
          {addressFields}
          {coordinateFields}
        </div>
      </FormSection>

      <FormSection
        expanded
        id="priceSpecs"
        isDesktop
        title={t('propertyCreate.sections.priceSpecs')}
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {priceField}
          {currencySelect}
          {areaField}
          {roomFields}
          {whatsappField}
        </div>
      </FormSection>

      <FormSection
        expanded
        id="media"
        isDesktop
        title={t('propertyCreate.sections.media')}
      >
        {mediaBlock}
      </FormSection>

      <FormSection
        expanded
        id="otherDetails"
        isDesktop
        title={t('propertyCreate.sections.otherDetails')}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          {statusSelect}
          {transactionSelect}
          {propertyTypeSelect}
          {featuredCheckbox}
        </div>
      </FormSection>

      {formErrorNotice}

      <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-end">
        <Button
          disabled={isSubmitting}
          onClick={() => {
            if (
              !warnUnsaved ||
              window.confirm(t('propertyCreate.leaveConfirmation'))
            ) {
              navigate('/dashboard')
            }
          }}
          variant="secondary"
        >
          {t('propertyCreate.actions.cancel')}
        </Button>
        <Button disabled={isSubmitting} type="submit">
          {isSubmitting && (
            <LoaderCircle
              aria-hidden="true"
              className="animate-spin motion-reduce:animate-none"
              size={18}
            />
          )}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
