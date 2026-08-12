import { AlertCircle, Building2, SearchX } from 'lucide-react'

import Button from '../../../components/ui/Button.jsx'
import { useLocale } from '../../../hooks/useLocale.js'

const stateIcons = {
  empty: Building2,
  error: AlertCircle,
  notFound: SearchX,
  propertiesEmpty: Building2,
}

// Each state names the message branch it reads, so the copy stays where the
// rest of the office wording lives instead of being assembled from fragments.
const messagePrefixes = {
  empty: 'offices.empty',
  error: 'offices.error',
  notFound: 'offices.details.notFound',
  propertiesEmpty: 'offices.details.properties.empty',
}

/**
 * The shared empty / error surface for both office pages, following the same
 * shape as `ResultState` on the property results page.
 *
 * @param {object} props
 * @param {() => void} [props.onAction] Renders the state's action when given.
 * @param {keyof typeof stateIcons} props.type
 */
export default function OfficesState({ onAction, type }) {
  const { t } = useLocale()
  const Icon = stateIcons[type]
  const prefix = messagePrefixes[type]

  return (
    <section
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      className="rounded-2xl border border-line bg-surface px-6 py-14 text-center"
    >
      <Icon aria-hidden="true" className="mx-auto text-accent" size={32} />
      <h2 className="mt-5 text-lg font-semibold text-ink sm:text-xl">
        {t(`${prefix}.title`)}
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted sm:text-base">
        {t(`${prefix}.description`)}
      </p>
      {onAction && (
        <Button className="mt-6" onClick={onAction} variant="secondary">
          {t(`${prefix}.action`)}
        </Button>
      )}
    </section>
  )
}
