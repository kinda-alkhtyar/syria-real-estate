import { BadgeDollarSign, MapPinned, Search, ShieldCheck } from 'lucide-react'

import { useLocale } from '../../../hooks/useLocale.js'
import Container from '../../ui/Container.jsx'

/**
 * Figma sets this section in Alexandria; headings already inherit it from
 * globals.css, so body-level text opts in with the same declared stack.
 */
const displayFont = '[font-family:var(--font-display)]'

export default function TrustStats() {
  const { t } = useLocale()

  const trustIndicators = [
    {
      icon: ShieldCheck,
      value: t('trust.moderated.value'),
      label: t('trust.moderated.label'),
    },
    {
      icon: BadgeDollarSign,
      value: t('trust.currency.value'),
      label: t('trust.currency.label'),
    },
    {
      icon: Search,
      value: t('trust.search.value'),
      label: t('trust.search.label'),
    },
    {
      icon: MapPinned,
      value: t('trust.local.value'),
      label: t('trust.local.label'),
    },
  ]

  return (
    <section
      aria-labelledby="trust-title"
      className="bg-home-panel py-12 sm:py-14 xl:min-h-[520px]! xl:py-0 xl:pt-[72px]! xl:pb-[80px]!"
      id="trust"
    >
      <Container className="lg:px-20 xl:w-[min(1280px,calc(100%-160px))]! xl:px-0!">
        <h2
          className="text-start text-2xl font-semibold text-ink xl:max-w-[600px]! xl:text-[36px]! xl:leading-[48px]! xl:text-home-heading!"
          id="trust-title"
        >
          {t('trust.title')}
        </h2>
        <p
          className={`mt-2 text-start text-base leading-7 text-muted xl:mt-[8px]! xl:max-w-[700px]! xl:text-[18px]! xl:font-normal! xl:leading-[30px]! xl:text-home-muted! ${displayFont}`}
        >
          {t('trust.description')}
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:rtl:[direction:rtl] xl:mt-[58px]! xl:grid-cols-[repeat(4,305px)]! xl:gap-[20px]!">
          {trustIndicators.map((indicator) => {
            const Icon = indicator.icon

            return (
              <div
                className="flex min-w-0 flex-col items-start rounded-[16px] border border-home-card-border bg-home-section p-[24px] text-start xl:min-h-[220px]"
                key={indicator.value}
              >
                <span
                  aria-hidden="true"
                  className="inline-flex size-[56px] shrink-0 items-center justify-center rounded-full bg-home-gold-soft text-home-gold"
                >
                  <Icon size={24} strokeWidth={1.6} />
                </span>
                <div className="mt-[24px]">
                  <dt
                    className={`text-[20px] font-semibold leading-[30px] text-home-heading ${displayFont}`}
                  >
                    {indicator.value}
                  </dt>
                  <dd
                    className={`mt-[10px] text-[14px] font-semibold leading-[22px] text-home-muted ${displayFont}`}
                  >
                    {indicator.label}
                  </dd>
                </div>
              </div>
            )
          })}
        </div>
      </Container>
    </section>
  )
}
