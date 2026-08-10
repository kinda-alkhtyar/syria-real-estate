import { navigationItems } from '../../constants/navigation.js'
import { useLocale } from '../../hooks/useLocale.js'
import Container from '../ui/Container.jsx'

/** Resolves an existing navigation destination so footer links stay in sync with the header. */
const navHref = (labelKey) =>
  navigationItems.find((item) => item.labelKey === labelKey)?.href

const linkClassName =
  'text-sm text-white/70 xl:text-[15px]! xl:font-semibold! xl:leading-[28px]!'

export default function Footer() {
  const { t, locale, locales, setLocale } = useLocale()
  const currentYear = new Date().getFullYear()

  const footerColumns = [
    {
      title: t('footer.platform'),
      links: [
        { label: t('navigation.about'), href: navHref('navigation.about') },
        { label: t('footer.howItWorks') },
        { label: t('actions.addProperty'), href: '/dashboard/properties/new' },
      ],
    },
    {
      title: t('footer.properties'),
      links: [
        { label: t('navigation.forSale'), href: navHref('navigation.forSale') },
        { label: t('navigation.forRent'), href: navHref('navigation.forRent') },
        { label: t('navigation.stays'), href: navHref('navigation.stays') },
        { label: t('navigation.projects'), href: navHref('navigation.projects') },
      ],
    },
    {
      title: t('footer.support'),
      links: [
        { label: t('footer.contact') },
        { label: t('footer.faq') },
        { label: t('footer.privacy') },
        { label: t('footer.terms') },
      ],
    },
  ]

  return (
    <footer className="bg-[#0E1C2E] text-white">
      <Container className="py-14 sm:py-16 lg:px-20 lg:py-18 xl:w-[min(1280px,calc(100%-160px))]! xl:px-0! xl:py-0 xl:pt-[72px]! xl:pb-[104px]!">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.2fr_0.7fr_0.7fr_0.7fr] lg:gap-12 lg:rtl:[direction:rtl] xl:grid-cols-[400px_180px_180px_180px]! xl:justify-start xl:gap-[80px]!">
          <div className="max-w-lg xl:max-w-none!">
            <a
              aria-label={t('accessibility.home')}
              className="inline-block text-2xl font-semibold text-white xl:max-w-[360px]! xl:text-[28px]! xl:leading-[28px]!"
              href="/"
            >
              {t('brand.name')}
            </a>
            <p className="mt-4 text-sm leading-7 text-white/70 xl:mt-[32px]! xl:max-w-[400px]! xl:text-[16px]! xl:font-semibold! xl:leading-[28px]!">
              {t('footer.summary')}
            </p>
          </div>

          {footerColumns.map((column) => (
            <div key={column.title}>
              <h2 className="text-sm font-bold text-white xl:text-[18px]! xl:font-semibold! xl:leading-[28px]!">
                {column.title}
              </h2>
              <ul className="mt-3 grid gap-2.5 xl:mt-[14px]! xl:gap-[14px]!">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.href ? (
                      <a
                        className={`${linkClassName} transition-colors hover:text-white`}
                        href={link.href}
                      >
                        {link.label}
                      </a>
                    ) : (
                      <span className={linkClassName}>{link.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-white/12 pt-6 text-sm text-white/60 sm:flex-row sm:items-center sm:justify-between xl:mt-[82px]! xl:pt-[39px]!">
          <p className="xl:text-[15px]! xl:leading-[26px]!">
            {t('footer.copyright', { year: currentYear })}
          </p>
          <div className="flex items-center gap-4 xl:gap-[20px]!">
            {locales.map((loc) => (
              <button
                key={loc.code}
                type="button"
                onClick={() => setLocale(loc.code)}
                className={`text-sm font-medium transition-colors duration-150 xl:text-[15px]! xl:font-normal! xl:leading-[26px]! ${
                  locale.code === loc.code ? 'text-[#D0A64A]' : 'text-white/60'
                }`}
              >
                {t(`languages.${loc.code}`)}
              </button>
            ))}
          </div>
        </div>
      </Container>
    </footer>
  )
}
