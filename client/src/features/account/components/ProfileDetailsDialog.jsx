import { LoaderCircle } from 'lucide-react'
import { useId, useRef, useState } from 'react'

import { ApiError } from '../../../api/api-client.js'
import Button from '../../../components/ui/Button.jsx'
import { useLocale } from '../../../hooks/useLocale.js'
import { updateMyProfile } from '../api/account-api.js'
import {
  accountFieldLimits,
  toProfileFormValues,
  toProfilePayload,
  validateProfileForm,
} from '../forms/account-forms.js'
import AccountDialog from './AccountDialog.jsx'
import {
  alertClassName,
  errorTextClassName,
  inputClassName,
  labelClassName,
  readOnlyInputClassName,
} from './account-field-classes.js'

function requestErrorKey(error) {
  if (!(error instanceof ApiError)) return 'account.feedback.saveError'
  if (error.status === 401) return 'account.feedback.sessionExpired'
  if (error.status === 429) return 'account.feedback.rateLimited'
  return 'account.feedback.saveError'
}

/**
 * Edits the three writable profile fields. The email is shown because the
 * account is recognised by it, and it is read-only because the API refuses to
 * change it — a disabled input would drop out of the tab order and say less.
 *
 * @param {object} props
 * @param {() => void} props.onClose
 * @param {(profile: object) => void} props.onSaved Receives the profile the API
 *   returned, so the page never has to re-read it.
 * @param {object} props.profile
 */
export default function ProfileDetailsDialog({ onClose, onSaved, profile }) {
  const { t } = useLocale()
  const titleId = useId()
  const descriptionId = useId()
  const nameId = useId()
  const emailId = useId()
  const phoneId = useId()
  const whatsappId = useId()
  const nameRef = useRef(null)
  const [values, setValues] = useState(() => toProfileFormValues(profile))
  const [errors, setErrors] = useState({})
  const [errorKey, setErrorKey] = useState('')
  const [pending, setPending] = useState(false)

  const fields = [
    { autoComplete: 'tel', id: phoneId, label: 'phone', name: 'phone' },
    { autoComplete: 'tel', id: whatsappId, label: 'whatsapp', name: 'whatsapp' },
  ]

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) =>
      current[field] ? { ...current, [field]: '' } : current,
    )
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (pending) return

    const nextErrors = validateProfileForm(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setErrorKey('')
    setPending(true)
    try {
      onSaved(await updateMyProfile(toProfilePayload(values)))
    } catch (error) {
      setErrorKey(requestErrorKey(error))
    } finally {
      setPending(false)
    }
  }

  return (
    <AccountDialog
      description={t('account.editDialog.description')}
      descriptionId={descriptionId}
      initialFocusRef={nameRef}
      onClose={onClose}
      pending={pending}
      title={t('account.editDialog.title')}
      titleId={titleId}
    >
      <form className="mt-5 grid gap-4" noValidate onSubmit={handleSubmit}>
        <div>
          <label className={labelClassName} htmlFor={nameId}>
            {t('account.details.name')}
          </label>
          <input
            aria-describedby={errors.name ? `${nameId}-error` : undefined}
            aria-invalid={errors.name ? 'true' : undefined}
            autoComplete="name"
            className={inputClassName}
            id={nameId}
            maxLength={accountFieldLimits.name}
            onChange={(event) => update('name', event.target.value)}
            ref={nameRef}
            value={values.name}
          />
          {errors.name && (
            <p className={errorTextClassName} id={`${nameId}-error`} role="alert">
              {t(errors.name, { maximum: accountFieldLimits.name })}
            </p>
          )}
        </div>

        <div>
          <label className={labelClassName} htmlFor={emailId}>
            {t('account.details.email')}
          </label>
          <input
            aria-describedby={`${emailId}-hint`}
            className={readOnlyInputClassName}
            id={emailId}
            readOnly
            value={profile.email}
          />
          <p className="mt-1.5 text-sm text-muted" id={`${emailId}-hint`}>
            {t('account.details.emailLocked')}
          </p>
        </div>

        {fields.map((field) => (
          <div key={field.name}>
            <label className={labelClassName} htmlFor={field.id}>
              {t(`account.details.${field.label}`)}
            </label>
            <input
              aria-describedby={
                errors[field.name] ? `${field.id}-error` : undefined
              }
              aria-invalid={errors[field.name] ? 'true' : undefined}
              autoComplete={field.autoComplete}
              className={inputClassName}
              dir="ltr"
              id={field.id}
              inputMode="tel"
              maxLength={accountFieldLimits[field.name]}
              onChange={(event) => update(field.name, event.target.value)}
              value={values[field.name]}
            />
            {errors[field.name] && (
              <p
                className={errorTextClassName}
                id={`${field.id}-error`}
                role="alert"
              >
                {t(errors[field.name])}
              </p>
            )}
          </div>
        ))}

        {errorKey && (
          <p className={alertClassName} role="alert">
            {t(errorKey)}
          </p>
        )}

        <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            disabled={pending}
            onClick={onClose}
            type="button"
            variant="secondary"
          >
            {t('account.editDialog.cancel')}
          </Button>
          <Button disabled={pending} type="submit">
            {pending && (
              <LoaderCircle
                aria-hidden="true"
                className="animate-spin motion-reduce:animate-none"
                size={18}
              />
            )}
            {t(pending ? 'account.editDialog.saving' : 'account.editDialog.save')}
          </Button>
        </div>
      </form>
    </AccountDialog>
  )
}
