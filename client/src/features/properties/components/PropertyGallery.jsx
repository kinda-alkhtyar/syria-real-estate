import { useState } from 'react'

import { useLocale } from '../../../hooks/useLocale.js'

/**
 * Accessible image gallery with a stable primary-image viewport.
 *
 * Phones and portrait tablets swipe through a snapping rail with a position
 * counter; from `lg` upwards the original primary image plus thumbnail grid
 * renders unchanged.
 */
export default function PropertyGallery({ images, label }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [visibleIndex, setVisibleIndex] = useState(0)
  const { t } = useLocale()
  const activeImage = images[activeIndex]

  function handleScroll(event) {
    const { clientWidth, scrollLeft } = event.currentTarget
    if (clientWidth === 0) return
    const next = Math.round(Math.abs(scrollLeft) / clientWidth)
    setVisibleIndex(Math.min(Math.max(next, 0), images.length - 1))
  }

  return (
    <section aria-label={label}>
      <div className="relative lg:hidden">
        <ul
          className="flex snap-x snap-mandatory overflow-x-auto rounded-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={handleScroll}
        >
          {images.map((image, index) => (
            <li className="w-full shrink-0 snap-start" key={image.src}>
              <div className="aspect-[4/3] overflow-hidden bg-skeleton">
                <img
                  alt={image.alt}
                  className="size-full object-cover"
                  decoding="async"
                  fetchPriority={index === 0 ? 'high' : undefined}
                  height={image.height}
                  loading={index === 0 ? undefined : 'lazy'}
                  src={image.src}
                  width={image.width}
                />
              </div>
            </li>
          ))}
        </ul>
        {images.length > 1 && (
          <>
            {/* Screen 3a shows position as dots; the counter stays for screen
                readers, where a row of dots conveys nothing. */}
            <p aria-live="polite" className="sr-only">
              {t('propertyDetails.imageCounter', {
                current: visibleIndex + 1,
                total: images.length,
              })}
            </p>
            <ul
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-3.5 flex justify-center gap-1.5"
            >
              {images.map((image, index) => (
                <li
                  className={`size-1.5 rounded-full ${
                    index === visibleIndex
                      ? 'bg-home-gold'
                      : 'bg-home-band-text/60'
                  }`}
                  key={image.src}
                />
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="hidden lg:block">
        <div className="aspect-[4/3] overflow-hidden rounded-3xl bg-skeleton">
          <img
            alt={activeImage.alt}
            className="size-full object-cover"
            decoding="async"
            fetchPriority="high"
            height={activeImage.height}
            src={activeImage.src}
            width={activeImage.width}
          />
        </div>
        {images.length > 1 && (
          <div className="mt-3 grid grid-cols-3 gap-3">
            {images.map((image, index) => (
              <button
                aria-label={image.alt}
                aria-pressed={index === activeIndex}
                className="aspect-[4/3] overflow-hidden rounded-xl border-2 border-transparent aria-pressed:border-accent"
                key={image.src}
                onClick={() => setActiveIndex(index)}
                type="button"
              >
                <img
                  alt=""
                  className="size-full object-cover"
                  decoding="async"
                  height={image.height}
                  loading="lazy"
                  src={image.src}
                  width={image.width}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
