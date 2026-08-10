import { AlertCircle, Building2 } from 'lucide-react'

import Button from '../../../components/ui/Button.jsx'
import Container from '../../../components/ui/Container.jsx'
import { useLocale } from '../../../hooks/useLocale.js'

export default function PropertyDetailsState({ type, onRetry }) {
  const { t } = useLocale()
  const Icon = type === 'error' ? AlertCircle : Building2

  return (
    <section className="bg-canvas py-20 text-center">
      <Container>
        <Icon aria-hidden="true" className="mx-auto text-accent" size={36} />
        <h1 className="mt-5 text-3xl font-semibold">
          {t(`propertyDetails.states.${type}.title`)}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-muted">
          {t(`propertyDetails.states.${type}.description`)}
        </p>
        {onRetry ? (
          <Button className="mt-6" onClick={onRetry} variant="secondary">
            {t('propertyDetails.states.error.action')}
          </Button>
        ) : (
          <Button className="mt-6" href="/properties" variant="secondary">
            {t('propertyDetails.states.notFound.action')}
          </Button>
        )}
      </Container>
    </section>
  )
}
