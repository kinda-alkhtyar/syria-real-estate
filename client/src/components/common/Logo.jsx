import { useLocale } from '../../hooks/useLocale.js'

const logoSources = {
  color: '/brand-full-color.png',
  white: '/brand-full-white.png',
  navy: '/brand-full-navy.png',
  'symbol-color': '/brand-symbol-color.png',
  'symbol-white': '/brand-symbol-white.png',
  'symbol-navy': '/brand-symbol-navy.png',
}

export default function Logo({
  variant = 'color',
  className = '',
  imageClassName = 'block h-[52px] w-auto max-w-[240px] object-contain object-left rtl:object-right',
}) {
  const { t } = useLocale()
  const src = logoSources[variant] ?? logoSources.color

  return (
    <a
      aria-label={t('accessibility.home')}
      className={`inline-flex items-center ${className}`}
      href="/"
    >
      <img
        alt={t('brand.name')}
        className={imageClassName}
        src={src}
      />
    </a>
  )
}
