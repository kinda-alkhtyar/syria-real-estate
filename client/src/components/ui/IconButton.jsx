export default function IconButton({
  label,
  children,
  className = '',
  ...props
}) {
  return (
    <button
      aria-label={label}
      className={`inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-ink transition duration-fast ease-standard hover:bg-stone-soft motion-reduce:transition-none ${className}`}
      type="button"
      {...props}
    >
      {children}
    </button>
  )
}
