import { Info } from 'lucide-react'

import { useLocale } from '../../../hooks/useLocale.js'

export default function PartialDataNotice() {
  const { t } = useLocale()

  return (
    <aside className="mb-6 flex gap-3 rounded-xl border border-line bg-surface p-4 text-sm text-muted">
      <Info aria-hidden="true" className="shrink-0 text-accent" size={19} />
      <p>{t('results.partialData')}</p>
    </aside>
  )
}
