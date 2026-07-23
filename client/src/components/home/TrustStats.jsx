import { trustIndicators } from '../../constants/homepage.js'
import Container from '../ui/Container.jsx'

export default function TrustStats() {
  return (
    <section className="border-y border-line bg-white py-8 sm:py-10" id="trust">
      <Container>
        <h2 className="sr-only">Platform trust principles</h2>
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
