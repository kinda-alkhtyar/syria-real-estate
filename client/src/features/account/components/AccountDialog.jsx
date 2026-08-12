import { useEffect, useRef } from 'react'

/**
 * The shell both account dialogs share: overlay, escape, and a tab order
 * trapped inside the panel. It is the same arrangement `ModerationDialog`
 * uses — kept in one place here because two dialogs now need it.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children The dialog body, usually a form.
 * @param {string} props.description
 * @param {string} props.descriptionId
 * @param {React.RefObject<HTMLElement>} [props.initialFocusRef] Focused on open;
 *   the panel itself takes focus when it is absent.
 * @param {() => void} props.onClose
 * @param {boolean} [props.pending] Blocks the overlay dismissal while a request
 *   is in flight, so a stray click cannot abandon a half-finished save.
 * @param {string} props.title
 * @param {string} props.titleId
 */
export default function AccountDialog({
  children,
  description,
  descriptionId,
  initialFocusRef,
  onClose,
  pending = false,
  title,
  titleId,
}) {
  const dialogRef = useRef(null)

  // The first field when there is one, the panel otherwise, so a screen reader
  // announces the dialog rather than leaving focus on the page behind it.
  useEffect(() => {
    ;(initialFocusRef?.current ?? dialogRef.current)?.focus()
  }, [initialFocusRef])

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = dialogRef.current?.querySelectorAll(
        'button, [href], textarea, input:not([type="hidden"]), select, [tabindex]:not([tabindex="-1"])',
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
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center bg-overlay p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose()
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
          {title}
        </h2>
        <p className="mt-2 leading-7 text-muted" id={descriptionId}>
          {description}
        </p>
        {children}
      </div>
    </div>
  )
}
