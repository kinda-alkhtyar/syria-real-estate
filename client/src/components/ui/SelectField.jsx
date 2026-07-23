export default function SelectField({
  children,
  className = '',
  label,
  name,
  ...props
}) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </span>
      <select
        className="min-h-12 w-full rounded-xl border border-line bg-white px-3 py-2 text-start text-sm font-medium text-ink outline-none transition focus:border-accent focus:ring-3 focus:ring-accent/15 motion-reduce:transition-none"
        name={name}
        {...props}
      >
        {children}
      </select>
    </label>
  )
}
