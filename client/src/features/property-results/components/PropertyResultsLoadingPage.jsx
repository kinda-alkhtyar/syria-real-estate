import Container from '../../../components/ui/Container.jsx'
import { useLocale } from '../../../hooks/useLocale.js'
import ResultsSkeleton from './ResultsSkeleton.jsx'

/**
 * Reserves the results-page layout while its route bundle is loading.
 */
export default function PropertyResultsLoadingPage() {
  const { t } = useLocale()

  return (
    <section
      aria-label={t('results.loading')}
      className="bg-canvas py-10 sm:py-14 lg:py-16"
    >
      <Container>
        <div className="mb-8 h-28 max-w-2xl animate-pulse rounded-2xl bg-skeleton motion-reduce:animate-none" />
        <ResultsSkeleton />
      </Container>
    </section>
  )
}
