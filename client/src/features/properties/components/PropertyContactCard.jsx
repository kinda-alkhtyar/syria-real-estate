import { Mail, MessageCircle, Phone } from 'lucide-react'

import Button from '../../../components/ui/Button.jsx'
import { useLocale } from '../../../hooks/useLocale.js'

/**
 * @param {object} props
 * @param {string} [props.callHref]
 * @param {string} [props.reference]
 * @param {string} [props.whatsappHref] Present only when the seller saved a
 *   number; both contact actions are omitted entirely otherwise, mirroring the
 *   phone screen.
 */
export default function PropertyContactCard({
  callHref,
  reference,
  whatsappHref,
}) {
  const { t } = useLocale()
  const hasContactActions = Boolean(whatsappHref || callHref)

  return (
    <aside className="h-fit w-full self-start rounded-2xl border border-line bg-elevated p-6 shadow-[var(--shadow-md)] lg:sticky lg:top-24">
      <h2 className="text-xl font-semibold">
        {t('propertyDetails.contactTitle')}
      </h2>
      <p className="mt-4 text-sm leading-6 text-muted">
        {t('propertyDetails.contactDescription')}
      </p>
      {hasContactActions && (
        <div className="mt-5 flex gap-2">
          {whatsappHref && (
            <a
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-whatsapp px-5 text-sm font-semibold text-on-whatsapp outline-none transition-colors duration-standard ease-standard hover:bg-whatsapp-hover focus-visible:ring-3 focus-visible:ring-focus/35 motion-reduce:transition-none"
              href={whatsappHref}
              rel="noreferrer noopener"
              target="_blank"
            >
              <MessageCircle aria-hidden="true" size={18} />
              {t('propertyDetails.whatsappAction')}
            </a>
          )}
          {callHref && (
            <a
              aria-label={t('propertyDetails.callAction')}
              className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-ink outline-none transition-colors duration-standard ease-standard hover:bg-hover focus-visible:ring-3 focus-visible:ring-focus/35 motion-reduce:transition-none"
              href={callHref}
            >
              <Phone aria-hidden="true" size={18} />
            </a>
          )}
        </div>
      )}
      <Button
        className={`w-full ${hasContactActions ? 'mt-3' : 'mt-5'}`}
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
