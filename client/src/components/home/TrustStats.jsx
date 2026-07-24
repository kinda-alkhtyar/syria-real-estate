import Container from '../ui/Container.jsx'
import { useLocale } from '../../hooks/useLocale.js'
import { messages } from '../../i18n/messages/index.js'

export default function TrustStats() {
  const { locale } = useLocale()
  const t = messages[locale]

  const trustIndicators = [
    {
      value: t.trust.moderated.value,
      label: t.trust.moderated.label,
    },
    {
      value: t.trust.local.value,
      label: t.trust.local.label,
    },
    {
      value: t.trust.currency.value,
      label: t.trust.currency.label,
    },
  ]

  return (
    <section className="border-y border-line bg-white py-8 sm:py-10" id="trust">
      <Container>
        <h2 className="sr-only">{t.trust.heading}</h2>
        <dl className="grid gap-6 sm:grid-cols-3 sm:divide-x sm:divide-line rtl:sm:divide-x-reverse">
          {trustIndicators.map((indicator) => (
            <div className="min-w-0 sm:px-6 first:ps-0 last:pe-0" key={indicator.value}>
              <dt className="text-sm leading-6 text-muted">{indicator.label}</dt>
              <dd className="mt-1 text-xl font-bold tracking-[-0.03em] text-ink">
                {indicator.value}
              </dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  )
}
