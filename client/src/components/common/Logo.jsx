import { useLocale } from '../../hooks/useLocale.js'
import { useTheme } from '../../hooks/useTheme.js'

import fullColor1x from '../../assets/brand/full-color-transparent@1x.png'
import fullColor2x from '../../assets/brand/full-color-transparent@2x.png'
import fullWhite1x from '../../assets/brand/full-white-transparent@1x.png'
import fullWhite2x from '../../assets/brand/full-white-transparent@2x.png'

/* Always the full lockup — house symbol plus the «عقارات في سوريا» wordmark —
   at every breakpoint. The width/height pairs are the real pixel dimensions of
   the 1x files, so the browser reserves the right box before the image lands;
   the rendered height comes from the class, width follows the intrinsic ratio. */
const lockup = {
  light: { src: fullColor1x, retina: fullColor2x, width: 95, height: 48 },
  dark: { src: fullWhite1x, retina: fullWhite2x, width: 96, height: 48 },
}

export default function Logo({ className = '', imageClassName = '' }) {
  const { t } = useLocale()
  const { resolvedTheme } = useTheme()
  const asset = resolvedTheme === 'dark' ? lockup.dark : lockup.light

  return (
    <a
      aria-label={t('accessibility.home')}
      className={`inline-flex items-center ${className}`}
      href="/"
    >
      <img
        alt={t('brand.name')}
        className={`h-11 w-auto object-contain desktop:h-12 ${imageClassName}`}
        decoding="async"
        height={asset.height}
        src={asset.src}
        srcSet={`${asset.src} 1x, ${asset.retina} 2x`}
        width={asset.width}
      />
    </a>
  )
}
