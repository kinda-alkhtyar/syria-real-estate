import { Building2 } from 'lucide-react'
import { useState } from 'react'

const sizes = {
  lg: 'size-20 rounded-2xl text-2xl sm:size-24 sm:text-3xl',
  md: 'size-14 rounded-xl text-lg sm:size-16 sm:text-xl',
}

/**
 * The office logo, falling back to its initials and finally to a neutral icon.
 *
 * A stored logo can 404 long after it was saved, so a failed load is treated
 * exactly like no logo at all rather than leaving a broken image in the card.
 *
 * @param {object} props
 * @param {string} [props.logoUrl]
 * @param {string} props.initials
 * @param {'md' | 'lg'} [props.size]
 */
export default function OfficeAvatar({ initials, logoUrl, size = 'md' }) {
  const [failed, setFailed] = useState(false)
  const showLogo = Boolean(logoUrl) && !failed

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden border border-line bg-surface font-bold text-accent ${sizes[size]}`}
    >
      {showLogo ? (
        <img
          alt=""
          className="size-full object-cover"
          loading="lazy"
          onError={() => setFailed(true)}
          src={logoUrl}
        />
      ) : initials ? (
        initials
      ) : (
        <Building2 className="text-muted" size={size === 'lg' ? 32 : 24} />
      )}
    </span>
  )
}
