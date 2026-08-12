import { Info, LoaderCircle, TriangleAlert } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'

import Button from '../../../components/ui/Button.jsx'
import { useLocale } from '../../../hooks/useLocale.js'

/**
 * The confirmation surface for closing an office. Same shell as the other
 * decisions in the app — overlay, focus handling, escape, a pending confirm
 * button — so a destructive choice behaves no differently from any other.
 *
 * The reassurance about the listings is a panel of its own rather than a line
 * in the description: "my properties are about to be deleted" is the fear this
 * dialog has to answer, and it has to answer it where it cannot be skimmed
 * past.
 */
export default function DeleteOfficeDialog({
  errorMessage = '',
  officeName,
  onCancel,
  onConfirm,
  pending = false,
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
          {t('officeForm.delete.title')}
        </h2>
        <p className="mt-2 leading-7 text-muted" id={descriptionId}>
          {t('officeForm.delete.description', { name: officeName })}
        </p>

        <p className="mt-4 flex items-start gap-2 rounded-xl border border-error/35 bg-error/10 px-4 py-3 text-sm font-semibold leading-6 text-ink">
          <TriangleAlert aria-hidden="true" className="mt-0.5 shrink-0" size={16} />
          <span>{t('officeForm.delete.warning')}</span>
        </p>

        <p className="mt-3 flex items-start gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-sm leading-6 text-ink">
          <Info aria-hidden="true" className="mt-0.5 shrink-0 text-muted" size={16} />
          <span>{t('officeForm.delete.propertiesNotice')}</span>
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
              {t('officeForm.delete.cancel')}
            </Button>
            <Button disabled={pending} type="submit" variant="danger">
              {pending && (
                <LoaderCircle
                  aria-hidden="true"
                  className="animate-spin motion-reduce:animate-none"
                  size={18}
                />
              )}
              {t('officeForm.delete.confirm')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
