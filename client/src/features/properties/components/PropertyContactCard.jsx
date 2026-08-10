import { Mail, MessageCircle } from 'lucide-react'

import Button from '../../../components/ui/Button.jsx'
import { useLocale } from '../../../hooks/useLocale.js'

/**
 * @param {object} props
 * @param {string} [props.reference]
 * @param {string} [props.whatsappHref] Present only when the seller saved a
 *   number; the WhatsApp action is omitted entirely otherwise.
 */
export default function PropertyContactCard({ reference, whatsappHref }) {
  const { t } = useLocale()

  return (
    <aside className="h-fit w-full self-start rounded-2xl border border-line bg-elevated p-6 shadow-[var(--shadow-md)] lg:sticky lg:top-24">
      <h2 className="text-xl font-semibold">
        {t('propertyDetails.contactTitle')}
      </h2>
      <p className="mt-4 text-sm leading-6 text-muted">
        {t('propertyDetails.contactDescription')}
      </p>
      {whatsappHref && (
        <a
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-whatsapp px-5 text-sm font-semibold text-on-whatsapp outline-none transition-colors duration-standard ease-standard hover:bg-whatsapp-hover focus-visible:ring-3 focus-visible:ring-focus/35 motion-reduce:transition-none"
          href={whatsappHref}
          rel="noreferrer noopener"
          target="_blank"
        >
          <MessageCircle aria-hidden="true" size={18} />
          {t('propertyDetails.whatsappAction')}
        </a>
      )}
      <Button
        className={`w-full ${whatsappHref ? 'mt-3' : 'mt-5'}`}
        disabled
      >
        <Mail aria-hidden="true" size={18} />
        {t('propertyDetails.contactAction')}
      </Button>
      <p className="mt-4 text-center text-xs text-muted">
        {t('footer.contactSoon')}
      </p>
      {reference && (
        <p className="mt-4 text-center text-xs text-muted">
          {t('propertyDetails.reference', { reference })}
        </p>
      )}
    </aside>
  )
}
