import { LoaderCircle, TriangleAlert } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'

import Button from '../../../components/ui/Button.jsx'
import { useLocale } from '../../../hooks/useLocale.js'

/**
 * The confirmation surface for deleting a listing. Same shell as
 * `ModerationDialog` — overlay, focus handling, escape, a pending confirm
 * button — because a destructive decision should not behave differently from
 * any other; only the body and the confirm colour differ.
 *
 * Focus lands on the dialog itself, as it does on the approval decision: a
 * screen reader announces the warning before anything is reachable, and an
 * Enter pressed out of habit submits nothing.
 */
export default function DeletePropertyDialog({
  errorMessage = '',
  onCancel,
  onConfirm,
  pending = false,
  propertyTitle,
}) {
  const { t } = useLocale()
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef(null)

  useEffect(() => {
    dialogRef.current?.focus()
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
    onConfirm()
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
          {t('dashboard.delete.title')}
        </h2>
        <p className="mt-2 leading-7 text-muted" id={descriptionId}>
          {t('dashboard.delete.description', { title: propertyTitle })}
        </p>

        <p className="mt-4 flex items-start gap-2 rounded-xl border border-error/35 bg-error/10 px-4 py-3 text-sm font-semibold leading-6 text-ink">
          <TriangleAlert aria-hidden="true" className="mt-0.5 shrink-0" size={16} />
          <span>{t('dashboard.delete.warning')}</span>
        </p>

        <form className="mt-5" noValidate onSubmit={handleSubmit}>
          {errorMessage && (
            <p
              className="mb-4 rounded-xl border border-error/35 bg-error/10 px-4 py-3 font-semibold text-ink"
              role="alert"
            >
              {errorMessage}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              disabled={pending}
              onClick={onCancel}
              type="button"
              variant="secondary"
            >
              {t('dashboard.delete.cancel')}
            </Button>
            <Button disabled={pending} type="submit" variant="danger">
              {pending && (
                <LoaderCircle
                  aria-hidden="true"
                  className="animate-spin motion-reduce:animate-none"
                  size={18}
                />
              )}
              {t('dashboard.delete.confirm')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
