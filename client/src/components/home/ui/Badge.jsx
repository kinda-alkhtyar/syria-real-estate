const variantStyles = {
  accent: 'bg-accent text-on-action',
  default: 'bg-accent-soft text-accent',
  secondary: 'bg-hover text-ink',
  surface: 'bg-surface text-ink',
}

const sizeStyles = {
  xs: 'px-2 py-0.5 text-xs',
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
}

/**
 * Provides a compact, reusable visual label.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {keyof typeof variantStyles} [props.variant]
 * @param {keyof typeof sizeStyles} [props.size]
 * @param {string} [props.className]
 */
export default function Badge({
  children,
  variant = 'default',
  size = 'sm',
  className = '',
  ...props
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-bold uppercase tracking-[0.12em] ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}
