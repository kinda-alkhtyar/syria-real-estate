/**
 * SectionTitle Component
 * 
 * ARCHITECTURAL DECISION:
 * Reusable section heading component that provides consistent styling and structure
 * for all homepage sections. This ensures visual hierarchy and accessibility
 * across the platform.
 * 
 * USAGE PATTERN:
 * All homepage sections (HeroSection, BrowseOptions, FeaturedListings, etc.)
 * use this component to maintain consistent typography, spacing, and semantics.
 * 
 * ACCESSIBILITY:
 * - Supports semantic heading levels (h1-h6)
 * - Properly paired with section elements for landmark navigation
 * - Screen readers announce heading hierarchy correctly
 * 
 * I18N:
 * Text content passed as props, managed by parent components using useLocale()
 * 
 * RTL/LTR:
 * Inherits text direction from document.dir via parent LocaleProvider
 * Uses text-align-start/end for proper alignment in both directions
 */

export default function SectionTitle({
  as: HeadingLevel = 'h2',
  label,
  title,
  description,
  titleId,
  className = '',
  labelClassName = '',
  titleClassName = '',
  descriptionClassName = '',
}) {
  return (
    <div className={`space-y-3 text-start sm:space-y-4 ${className}`}>
      {label && (
        <p
          className={`text-xs font-bold uppercase tracking-[0.16em] text-accent ${labelClassName}`}
        >
          {label}
        </p>
      )}
      {title && (
        <HeadingLevel
          className={`text-start text-3xl font-semibold tracking-[-0.04em] text-ink sm:text-4xl ${titleClassName}`}
          id={titleId}
        >
          {title}
        </HeadingLevel>
      )}
      {description && (
        <p
          className={`max-w-2xl text-start text-base leading-7 text-muted ${descriptionClassName}`}
        >
          {description}
        </p>
      )}
    </div>
  )
}
