import { useState } from 'react'

import { ApiError } from '../../../api/api-client.js'
import Button from '../../../components/ui/Button.jsx'
import { useLocale } from '../../../hooks/useLocale.js'
import {
  officeFieldLimits,
  officeGovernorates,
  toOfficePayload,
  validateOfficeForm,
} from '../forms/office-form.js'

function Field({
  error,
  hint,
  label,
  maxLength,
  multiline = false,
  name,
  onChange,
  required = false,
  value,
}) {
  const errorId = `${name}-error`
  const hintId = `${name}-hint`
  const describedBy = [hint ? hintId : '', error ? errorId : '']
    .filter(Boolean)
    .join(' ')
  const Input = multiline ? 'textarea' : 'input'

  return (
    <div className="min-w-0">
      <label
        className="mb-1.5 block text-sm font-semibold text-ink"
        htmlFor={name}
      >
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <Input
        aria-describedby={describedBy || undefined}
        aria-invalid={Boolean(error)}
        className={`w-full rounded-xl border bg-input px-4 py-3 text-start text-ink outline-none transition focus:border-focus focus:ring-3 focus:ring-focus/20 motion-reduce:transition-none ${
          multiline ? 'min-h-32 resize-y' : 'min-h-12'
        } ${error ? 'border-error' : 'border-input-line'}`}
        id={name}
        maxLength={maxLength}
        name={name}
        onChange={onChange}
        value={value}
      />
      {hint && (
        <p className="mt-1.5 text-xs text-muted" id={hintId}>
          {hint}
        </p>
      )}
      {error && (
        <p className="mt-1.5 text-sm font-semibold text-error" id={errorId}>
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * The create and edit form for an office. One name and one description are
 * typed, in the language being browsed, exactly like a listing's title.
 *
 * @param {object} props
 * @param {string} [props.errorKey] A submission failure raised by the page.
 * @param {'create' | 'edit'} props.mode
 * @param {(payload: object) => Promise<void>} props.onSubmit
 * @param {() => void} props.onCancel
 * @param {object} props.values
 * @param {(values: object) => void} props.onValuesChange
 */
export default function OfficeForm({
  errorKey = '',
  mode,
  onCancel,
  onSubmit,
  onValuesChange,
  values,
}) {
  const { locale, t } = useLocale()
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formErrorKey, setFormErrorKey] = useState('')

  function handleChange(event) {
    const { name, value } = event.target
    onValuesChange({ ...values, [name]: value })
    setErrors((current) => {
      if (!current[name]) return current
      const next = { ...current }
      delete next[name]
      return next
    })
  }

  function errorMessage(field) {
    return errors[field] ? t(errors[field]) : ''
  }

  /** e.g. «اسم المكتب (العربية)» — names the language being written. */
  function localizedLabel(fieldKey) {
    return t('officeForm.localizedField', {
      field: t(`officeForm.fields.${fieldKey}`),
      language: t(`languages.${locale.code}`),
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (isSubmitting) return

    const nextErrors = validateOfficeForm(values)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      document.getElementById(Object.keys(nextErrors)[0])?.focus()
      return
    }

    setErrors({})
    setFormErrorKey('')
    setIsSubmitting(true)
    try {
      await onSubmit(toOfficePayload(values, { localeCode: locale.code, mode }))
    } catch (error) {
      if (error instanceof ApiError && error.code === 'OFFICE_ALREADY_EXISTS') {
        setFormErrorKey('officeForm.feedback.alreadyExists')
      } else if (error instanceof ApiError && error.code === 'INVALID_REQUEST') {
        setFormErrorKey('officeForm.feedback.validation')
      } else if (error instanceof ApiError && error.code === 'NETWORK_ERROR') {
        setFormErrorKey('officeForm.feedback.network')
      } else {
        setFormErrorKey('officeForm.feedback.unexpected')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const visibleErrorKey = formErrorKey || errorKey

  return (
    <form className="mt-6 grid gap-5" noValidate onSubmit={handleSubmit}>
      {visibleErrorKey && (
        <p
          aria-live="assertive"
          className="rounded-xl border border-error/35 bg-error/10 px-4 py-3 text-sm font-semibold text-ink"
          role="alert"
        >
          {t(visibleErrorKey)}
        </p>
      )}

      <Field
        error={errorMessage('name')}
        hint={mode === 'create' ? t('officeForm.hints.name') : undefined}
        label={localizedLabel('name')}
        maxLength={officeFieldLimits.name}
        name="name"
        onChange={handleChange}
        required
        value={values.name}
      />

      <Field
        error={errorMessage('description')}
        label={localizedLabel('description')}
        maxLength={officeFieldLimits.description}
        multiline
        name="description"
        onChange={handleChange}
        value={values.description}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="min-w-0">
          <label
            className="mb-1.5 block text-sm font-semibold text-ink"
            htmlFor="governorate"
          >
            {t('officeForm.fields.governorate')}
          </label>
          <select
            className="min-h-12 w-full rounded-xl border border-input-line bg-input px-4 py-2 text-start text-ink outline-none focus:border-focus focus:ring-3 focus:ring-focus/20"
            id="governorate"
            name="governorate"
            onChange={handleChange}
            value={values.governorate}
          >
            {officeGovernorates.map(({ labelKey, value }) => (
              <option key={value} value={value}>
                {t(labelKey)}
              </option>
            ))}
          </select>
        </div>

        <Field
          error={errorMessage('city')}
          label={t('officeForm.fields.city')}
          maxLength={officeFieldLimits.city}
          name="city"
          onChange={handleChange}
          value={values.city}
        />

        <Field
          error={errorMessage('phone')}
          label={t('officeForm.fields.phone')}
          maxLength={officeFieldLimits.phone}
          name="phone"
          onChange={handleChange}
          value={values.phone}
        />

        <Field
          error={errorMessage('whatsapp')}
          label={t('officeForm.fields.whatsapp')}
          maxLength={officeFieldLimits.whatsapp}
          name="whatsapp"
          onChange={handleChange}
          value={values.whatsapp}
        />
      </div>

      <div className="mt-2 flex flex-wrap gap-3">
        <Button disabled={isSubmitting} type="submit">
          {t(
            isSubmitting
              ? 'officeForm.actions.saving'
              : mode === 'create'
                ? 'officeForm.actions.create'
                : 'officeForm.actions.save',
          )}
        </Button>
        <Button
          disabled={isSubmitting}
          onClick={onCancel}
          type="button"
          variant="secondary"
        >
          {t('officeForm.actions.cancel')}
        </Button>
      </div>
    </form>
  )
}
