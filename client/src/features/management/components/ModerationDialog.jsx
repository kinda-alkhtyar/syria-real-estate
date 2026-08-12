import { LoaderCircle } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

import Button from '../../../components/ui/Button.jsx'
import { useLocale } from '../../../hooks/useLocale.js'
import {
  rejectionReasonMaximumLength,
  rejectionReasonRemaining,
  validateRejectionReason,
} from '../forms/rejection-form.js'

/**
 * The confirmation surface for both moderation decisions. Approving only needs
 * a yes; rejecting needs a reason, which the owner reads on their own listing,
 * so the note is validated here before a request is spent on it.
 *
 * One component for both because the shell — overlay, focus handling, escape,
 * the pending state on the confirm button — is identical, and only the body
 * differs.
 */
export default function ModerationDialog({
  errorMessage = '',
  onCancel,
  onConfirm,
  pending = false,
  propertyTitle,
  variant,
}) {
  const { t } = useLocale()
  const titleId = useId()
  const descriptionId = useId()
  const reasonId = useId()
  const reasonErrorId = useId()
  const dialogRef = useRef(null)
  const initialFocusRef = useRef(null)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState('')
  const isReject = variant === 'reject'

  // The reason field when there is one, the dialog itself otherwise, so a
  // screen reader announces the decision rather than leaving focus on the page
  // behind.
  useEffect(() => {
    ;(initialFocusRef.current ?? dialogRef.current)?.focus()
  }, [])

  // Escape closes, and the tab order is trapped inside the dialog so the page
  // behind it never takes focus while the decision is open.
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onCancel()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = dialogRef.current?.querySelectorAll(
        'button, [href], textarea, input, select, [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [onCancel])

  function handleSubmit(event) {
    event.preventDefault()
    if (pending) return
    if (!isReject) {
      onConfirm()
      return
    }

    const error = validateRejectionReason(reason)
    setReasonError(error)
    if (error) {
      initialFocusRef.current?.focus()
      return
    }
    onConfirm(reason.trim())
  }

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center bg-overlay p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onCancel()
      }}
    >
      <div
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-elevated p-6 text-start shadow-lg"
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <h2 className="text-xl font-bold text-ink" id={titleId}>
          {t(`review.${variant}.title`)}
        </h2>
        <p className="mt-2 leading-7 text-muted" id={descriptionId}>
          {t(`review.${variant}.description`, { title: propertyTitle })}
        </p>

        <form className="mt-5" noValidate onSubmit={handleSubmit}>
          {isReject && (
            <div>
              <label
                className="block text-sm font-semibold text-ink"
                htmlFor={reasonId}
              >
                {t('review.reject.reasonLabel')}
              </label>
              <textarea
                aria-describedby={reasonError ? reasonErrorId : undefined}
                aria-invalid={reasonError ? 'true' : undefined}
                className="mt-1.5 min-h-32 w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-ink outline-none transition focus:border-focus focus:ring-3 focus:ring-focus/20"
                id={reasonId}
                maxLength={rejectionReasonMaximumLength}
                onChange={(event) => {
                  setReason(event.target.value)
                  if (reasonError) setReasonError('')
                }}
                ref={initialFocusRef}
                value={reason}
              />
              <p className="mt-1.5 text-sm text-muted">
                {t('review.reject.reasonCounter', {
                  remaining: rejectionReasonRemaining(reason),
                  maximum: rejectionReasonMaximumLength,
                })}
              </p>
              {reasonError && (
                <p
                  className="mt-1.5 text-sm font-semibold text-error"
                  id={reasonErrorId}
                  role="alert"
                >
                  {t(`review.reject.validation.${reasonError}`, {
                    maximum: rejectionReasonMaximumLength,
                  })}
                </p>
              )}
            </div>
          )}

          {errorMessage && (
            <p
              className="mt-4 rounded-xl border border-error/35 bg-error/10 px-4 py-3 font-semibold text-ink"
              role="alert"
            >
              {errorMessage}
            </p>
          )}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              disabled={pending}
              onClick={onCancel}
              type="button"
              variant="secondary"
            >
              {t('review.actions.cancel')}
            </Button>
            <Button disabled={pending} type="submit">
              {pending && (
                <LoaderCircle
                  aria-hidden="true"
                  className="animate-spin motion-reduce:animate-none"
                  size={18}
                />
              )}
              {t(`review.${variant}.confirm`)}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
