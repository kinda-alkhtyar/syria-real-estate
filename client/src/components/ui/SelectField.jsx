/**
 * Renders a labelled native select with consistent accessible interaction.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 * @param {string} props.id
 * @param {string} props.label
 * @param {string} props.name
 */
export default function SelectField({
  children,
  className = '',
  id,
  label,
  name,
  selectClassName = '',
  hideLabelOnDesktop = false,
  ...props
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label
        className={`mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-muted [&:lang(ar)]:tracking-normal ${
          hideLabelOnDesktop ? 'lg:sr-only' : ''
        }`}
        htmlFor={id}
      >
        {label}
      </label>
      <select
        className={`min-h-13 w-full rounded-lg border border-input-line bg-input px-4 py-2 text-start text-sm font-medium text-ink outline-none transition focus:border-focus focus:ring-3 focus:ring-focus/20 motion-reduce:transition-none ${selectClassName}`}
        id={id}
        name={name}
        {...props}
      >
        {children}
      </select>
    </div>
  )
}
