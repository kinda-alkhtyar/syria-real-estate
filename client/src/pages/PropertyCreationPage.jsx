import { useEffect } from 'react'

import PropertyCreationForm from '../features/management/components/PropertyCreationForm.jsx'
import { useLocale } from '../hooks/useLocale.js'

export default function PropertyCreationPage() {
  const { t } = useLocale()

  useEffect(() => {
    const previousTitle = document.title
    document.title = `${t('propertyCreate.title')} | ${t('brand.name')}`
    return () => {
      document.title = previousTitle
    }
  }, [t])

  return (
    <section aria-labelledby="property-create-title">
      {/* The phone wizard carries its own header from the approved design. */}
      <header className="mb-7 hidden border-b border-line pb-6 lg:block">
        <p className="text-sm font-bold uppercase tracking-wide text-accent">
          {t('propertyCreate.eyebrow')}
        </p>
        <h1
          className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl"
          id="property-create-title"
        >
          {t('propertyCreate.title')}
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-muted">
          {t('propertyCreate.description')}
        </p>
      </header>
      <PropertyCreationForm />
    </section>
  )
}
