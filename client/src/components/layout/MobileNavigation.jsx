import Button from '../ui/Button.jsx'
import LanguageSelector from '../common/LanguageSelector.jsx'
import { useLocale } from '../../hooks/useLocale.js'

export default function MobileNavigation({
  id,
  isOpen,
  items,
  onNavigate,
}) {
  const { t } = useLocale()

  if (!isOpen) {
    return null
  }

  return (
    <div
      className="border-t border-line py-4 lg:hidden"
      id={id}
    >
      <nav aria-label={t('accessibility.mobileNavigation')}>
        <ul className="grid gap-1">
          {items.map((item) => (
            <li key={item.href}>
              <a
                className="flex min-h-11 items-center rounded-xl px-3 py-2 text-base font-semibold text-ink hover:bg-stone-soft"
                href={item.href}
                onClick={onNavigate}
              >
                {t(item.labelKey)}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-3">
        <LanguageSelector />
        <Button href="#login" variant="secondary">
          {t('actions.login')}
        </Button>
        <Button href="#list-property">{t('actions.addProperty')}</Button>
      </div>
    </div>
  )
}
