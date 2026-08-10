import { ChevronLeft, ChevronRight } from 'lucide-react'

import { useLocale } from '../../../hooks/useLocale.js'

export default function ResultPagination({ page, pageCount, onChange }) {
  const { t } = useLocale()

  if (pageCount <= 1) return null

  return (
    <nav
      aria-label={t('accessibility.resultsPagination')}
      className="mt-10 flex items-center justify-center gap-3"
    >
      <button
        aria-label={t('actions.previousPage')}
        className="inline-flex size-11 items-center justify-center rounded-xl border border-line bg-surface disabled:opacity-40"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        type="button"
      >
        <ChevronLeft aria-hidden="true" className="rtl:-scale-x-100" />
      </button>
      <span aria-current="page" className="text-sm font-semibold">
        {t('results.pageOf', { page, pageCount })}
      </span>
      <button
        aria-label={t('actions.nextPage')}
        className="inline-flex size-11 items-center justify-center rounded-xl border border-line bg-surface disabled:opacity-40"
        disabled={page === pageCount}
        onClick={() => onChange(page + 1)}
        type="button"
      >
        <ChevronRight aria-hidden="true" className="rtl:-scale-x-100" />
      </button>
    </nav>
  )
}
