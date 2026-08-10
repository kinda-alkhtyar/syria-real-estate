import { AlertCircle, Building2, SearchX } from 'lucide-react'

import Button from '../../../components/ui/Button.jsx'
import { useLocale } from '../../../hooks/useLocale.js'

const stateIcons = {
  empty: Building2,
  error: AlertCircle,
  noResults: SearchX,
}

export default function ResultState({ onAction, type }) {
  const { t } = useLocale()
  const Icon = stateIcons[type]

  return (
    <section
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      className="rounded-2xl border border-line bg-surface px-6 py-16 text-center"
    >
      <Icon aria-hidden="true" className="mx-auto text-accent" size={32} />
      <h2 className="mt-5 text-xl font-semibold text-ink">
        {t(`results.states.${type}.title`)}
      </h2>
      <p className="mx-auto mt-3 max-w-md leading-relaxed text-muted">
        {t(`results.states.${type}.description`)}
      </p>
      {onAction && (
        <Button className="mt-6" onClick={onAction} variant="secondary">
          {t(`results.states.${type}.action`)}
        </Button>
      )}
    </section>
  )
}
