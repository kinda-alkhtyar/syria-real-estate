import { Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { useId, useRef, useState } from 'react'

import { ApiError } from '../../../api/api-client.js'
import Button from '../../../components/ui/Button.jsx'
import { useLocale } from '../../../hooks/useLocale.js'
import { changeMyPassword } from '../api/account-api.js'
import {
  minimumPasswordLength,
  passwordFormInitialValues,
  toPasswordPayload,
  validatePasswordForm,
} from '../forms/account-forms.js'
import AccountDialog from './AccountDialog.jsx'
import {
  alertClassName,
  errorTextClassName,
  inputClassName,
  labelClassName,
} from './account-field-classes.js'

/**
 * The current password is wrong far more often than the session is gone, and
 * both answer 401, so the code decides which of the two the person reads.
 */
function requestErrorKey(error) {
  if (!(error instanceof ApiError)) return 'account.feedback.saveError'
  if (error.code === 'INVALID_CREDENTIALS') {
    return 'account.feedback.invalidCurrentPassword'
  }
  if (error.status === 401) return 'account.feedback.sessionExpired'
  if (error.code === 'PASSWORD_NOT_SET') {
    return 'account.feedback.passwordUnavailable'
  }
  if (error.status === 429) return 'account.feedback.rateLimited'
  return 'account.feedback.saveError'
}

const passwordFields = [
  { autoComplete: 'current-password', label: 'current', name: 'current' },
  { autoComplete: 'new-password', label: 'new', name: 'next' },
  { autoComplete: 'new-password', label: 'confirm', name: 'confirm' },
]

/**
 * Changing a password never signs the account out: the API keeps the session
 * that made the request, so this dialog closes back onto the same page.
 *
 * @param {object} props
 * @param {() => void} props.onClose
 * @param {() => void} props.onChanged
 */
export default function PasswordChangeDialog({ onChanged, onClose }) {
  const { t } = useLocale()
  const titleId = useId()
  const descriptionId = useId()
  const hintId = useId()
  const fieldPrefix = useId()
  const currentRef = useRef(null)
  const [values, setValues] = useState(passwordFormInitialValues)
  const [visible, setVisible] = useState(false)
  const [errors, setErrors] = useState({})
  const [errorKey, setErrorKey] = useState('')
  const [pending, setPending] = useState(false)

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) =>
      current[field] ? { ...current, [field]: '' } : current,
    )
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (pending) return

    const nextErrors = validatePasswordForm(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setErrorKey('')
    setPending(true)
    try {
      await changeMyPassword(toPasswordPayload(values))
      onChanged()
    } catch (error) {
      setErrorKey(requestErrorKey(error))
    } finally {
      setPending(false)
    }
  }

  return (
    <AccountDialog
      description={t('account.passwordDialog.description')}
      descriptionId={descriptionId}
      initialFocusRef={currentRef}
      onClose={onClose}
      pending={pending}
      title={t('account.passwordDialog.title')}
      titleId={titleId}
    >
      <form className="mt-5 grid gap-4" noValidate onSubmit={handleSubmit}>
        {passwordFields.map((field) => {
          const fieldId = `${fieldPrefix}-${field.name}`
          const error = errors[field.name]

          return (
            <div key={field.name}>
              <label className={labelClassName} htmlFor={fieldId}>
                {t(`account.passwordDialog.${field.label}`)}
              </label>
              <div className="relative">
                <input
                  aria-describedby={
                    [
                      error ? `${fieldId}-error` : '',
                      field.name === 'next' ? hintId : '',
                    ]
                      .filter(Boolean)
                      .join(' ') || undefined
                  }
                  aria-invalid={error ? 'true' : undefined}
                  autoComplete={field.autoComplete}
                  className={`${inputClassName} pe-12`}
                  id={fieldId}
                  onChange={(event) => update(field.name, event.target.value)}
                  type={visible ? 'text' : 'password'}
                  value={values[field.name]}
                />
                <button
                  aria-label={t(
                    visible ? 'auth.hidePassword' : 'auth.showPassword',
                  )}
                  aria-pressed={visible}
                  className="absolute inset-y-0 end-1 inline-flex w-11 items-center justify-center rounded-lg text-muted outline-none hover:text-ink focus-visible:ring-3 focus-visible:ring-focus/35"
                  onClick={() => setVisible((shown) => !shown)}
                  type="button"
                >
                  {visible ? (
                    <EyeOff aria-hidden="true" size={20} />
                  ) : (
                    <Eye aria-hidden="true" size={20} />
                  )}
                </button>
              </div>
              {field.name === 'next' && (
                <p className="mt-1.5 text-sm text-muted" id={hintId}>
                  {t('account.passwordDialog.hint', {
                    minimum: minimumPasswordLength,
                  })}
                </p>
              )}
              {error && (
                <p
                  className={errorTextClassName}
                  id={`${fieldId}-error`}
                  role="alert"
                >
                  {t(error, { minimum: minimumPasswordLength })}
                </p>
              )}
            </div>
          )
        })}

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
            {t(
              pending
                ? 'account.passwordDialog.submitting'
                : 'account.passwordDialog.submit',
            )}
          </Button>
        </div>
      </form>
    </AccountDialog>
  )
}
