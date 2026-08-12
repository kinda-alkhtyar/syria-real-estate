import { Check, Globe } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { useLocale } from '../../hooks/useLocale.js'
import IconButton from '../ui/IconButton.jsx'

/** Short badge shown inside the compact control; not translated by design. */
const shortCodes = {
  ar: 'ع',
  en: 'EN',
  de: 'DE',
  tr: 'TR',
}

/**
 * Single round 44px language control used at every breakpoint: the active
 * language code sits horizontally before the globe (forced LTR so the pair
 * keeps the same reading order in RTL), and the dropdown marks the active
 * locale with a check.
 *
 * @param {object} props
 * @param {string} [props.className] Extra root classes for placement only.
 */
export default function LanguageSelector({ className = '' }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)
  const { locale, locales, setLocale, t } = useLocale()
  const label = t('accessibility.languageMenu', {
    language: t(`languages.${locale.code}`),
  })

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    function handlePointerDown(event) {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown, { passive: true })
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div ref={containerRef} className={`relative shrink-0 ${className}`}>
      <IconButton
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="overflow-hidden rounded-full! duration-150!"
        label={label}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        title={label}
      >
        <span
          aria-hidden="true"
          className="flex items-center gap-[3px] leading-none"
          dir="ltr"
        >
          <span className="text-[13px] font-semibold leading-none">
            {shortCodes[locale.code] ?? locale.code.toUpperCase()}
          </span>
          <Globe className="shrink-0" size={18} />
        </span>
      </IconButton>

      {isOpen && (
        <div
          className="absolute end-0 top-full z-10 mt-2 min-w-40 rounded-xl border border-line bg-elevated p-2 shadow-lg"
          role="menu"
        >
          {locales.map((localeOption) => {
            const isActive = localeOption.code === locale.code

            return (
              <button
                key={localeOption.code}
                aria-checked={isActive}
                className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 text-start text-sm font-semibold text-ink transition duration-fast ease-standard hover:bg-hover focus-visible:ring-3 focus-visible:ring-focus/30 motion-reduce:transition-none"
                onClick={() => {
                  setLocale(localeOption.code)
                  setIsOpen(false)
                }}
                role="menuitemradio"
                type="button"
              >
                <span>{t(`languages.${localeOption.code}`)}</span>
                {isActive && (
                  <Check aria-hidden="true" className="shrink-0 text-focus" size={16} />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
