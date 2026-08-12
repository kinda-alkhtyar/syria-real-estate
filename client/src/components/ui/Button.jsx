const variants = {
  primary:
    'bg-action text-on-action shadow-sm hover:bg-action-hover active:bg-action-hover disabled:bg-action/45',
  secondary:
    'border border-line bg-action-secondary text-ink hover:border-input-line hover:bg-hover',
  quiet: 'text-ink hover:bg-hover',
  // For the confirm side of a destructive decision only, so the colour keeps
  // meaning something. The label takes the canvas colour rather than a fixed
  // white: the error red is dark on the light theme and light on the dark one,
  // and the canvas inverts with it, so the pair stays readable in both.
  danger: 'bg-error text-canvas shadow-sm hover:opacity-90 disabled:bg-error/45',
}

/**
 * Renders a consistently styled button or link without changing semantics.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 * @param {boolean} [props.disabled]
 * @param {string} [props.href]
 * @param {'button' | 'submit' | 'reset'} [props.type]
 * @param {keyof typeof variants} [props.variant]
 */
export default function Button({
  children,
  className = '',
  disabled = false,
  href,
  style,
  type = 'button',
  variant = 'primary',
  ...props
}) {
  const classes = [
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold leading-tight outline-none transition duration-standard ease-standard focus-visible:ring-3 focus-visible:ring-focus/35 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:pointer-events-none aria-disabled:cursor-not-allowed aria-disabled:opacity-60 motion-reduce:transition-none',
    variants[variant],
    className,
  ].join(' ')
  const resolvedStyle =
    variant === 'primary'
      ? { ...style, color: 'var(--primary-action-text)' }
      : style

  if (href) {
    return (
      <a
        aria-disabled={disabled || undefined}
        className={classes}
        href={disabled ? undefined : href}
        style={resolvedStyle}
        tabIndex={disabled ? -1 : undefined}
        {...props}
      >
        {children}
      </a>
    )
  }

  return (
    <button
      className={classes}
      disabled={disabled}
      style={resolvedStyle}
      type={type}
      {...props}
    >
      {children}
    </button>
  )
}
