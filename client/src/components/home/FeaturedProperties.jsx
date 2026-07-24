import Button from '../ui/Button.jsx'
import Container from '../ui/Container.jsx'
import PropertyCardPlaceholder from './PropertyCardPlaceholder.jsx'
import { useLocale } from '../../hooks/useLocale.js'
import { messages } from '../../i18n/messages/index.js'

export default function FeaturedProperties() {
  const { locale } = useLocale()
  const t = messages[locale]

  const propertyPlaceholders = [
    {
      id: 'residential',
      eyebrow: t.featured.residential.eyebrow,
      title: t.featured.residential.title,
      detail: t.featured.residential.detail,
    },
    {
      id: 'urban',
      eyebrow: t.featured.urban.eyebrow,
      title: t.featured.urban.title,
      detail: t.featured.urban.detail,
    },
    {
      id: 'investment',
      eyebrow: t.featured.investment.eyebrow,
      title: t.featured.investment.title,
      detail: t.featured.investment.detail,
    },
  ]

  return (
    <section className="bg-canvas py-16 sm:py-20 lg:py-24" id="featured">
      <Container>
        <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
              {t.featured.label}
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.04em] text-ink sm:text-4xl">
              {t.featured.title}
            </h2>
          </div>
          <Button href="#search" variant="secondary">
            {t.actions.browseAll}
          </Button>
        </div>

        <div className="mt-9 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {propertyPlaceholders.map((property) => (
            <PropertyCardPlaceholder key={property.id} property={property} />
          ))}
        </div>
      </Container>
    </section>
  )
}
