// The field shell both account dialogs draw, kept in one place so the two forms
// cannot drift apart. Plain module rather than a component so nothing here is
// re-exported from a `.jsx` file.
export const labelClassName = 'mb-1.5 block text-sm font-semibold text-ink'

export const inputClassName =
  'min-h-12 w-full rounded-xl border border-input-line bg-canvas px-4 text-ink outline-none transition focus:border-focus focus-visible:ring-3 focus-visible:ring-focus/35'

export const readOnlyInputClassName =
  'min-h-12 w-full cursor-not-allowed rounded-xl border border-line bg-hover px-4 text-muted outline-none'

export const errorTextClassName = 'mt-1.5 text-sm font-semibold text-error'

export const alertClassName =
  'mt-4 rounded-xl border border-error/35 bg-error/10 px-4 py-3 font-semibold text-ink'
