import { propertyPlaceholders } from '../../constants/homepage.js'
import Button from '../ui/Button.jsx'
import Container from '../ui/Container.jsx'
import PropertyCardPlaceholder from './PropertyCardPlaceholder.jsx'

export default function FeaturedProperties() {
  return (
    <section className="bg-canvas py-16 sm:py-20 lg:py-24" id="featured">
      <Container>
        <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
              Featured
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.04em] text-ink sm:text-4xl">
              A premium framework for properties worth discovering.
            </h2>
          </div>
          <Button href="#search" variant="secondary">
            Browse all
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
