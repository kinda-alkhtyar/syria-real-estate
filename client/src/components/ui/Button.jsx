const variants = {
  primary:
    'bg-ink text-white shadow-[0_10px_28px_rgba(25,45,38,0.16)] hover:bg-ink-soft',
  secondary:
    'border border-line bg-white text-ink hover:border-ink/30 hover:bg-stone-soft',
  quiet: 'text-ink hover:bg-stone-soft',
}

export default function Button({
  children,
  className = '',
  href,
  type = 'button',
  variant = 'primary',
  ...props
}) {
  const classes = [
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold leading-tight transition duration-standard ease-standard motion-reduce:transition-none',
    variants[variant],
    className,
  ].join(' ')

  if (href) {
    return (
      <a className={classes} href={href} {...props}>
        {children}
      </a>
    )
  }

  return (
    <button className={classes} type={type} {...props}>
      {children}
    </button>
  )
}
