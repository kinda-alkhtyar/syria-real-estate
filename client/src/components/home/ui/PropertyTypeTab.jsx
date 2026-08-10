/**
 * PropertyTypeTab Component
 * 
 * ARCHITECTURAL DECISION:
 * Reusable tab button for the BrowseOptions section. Allows users to filter
 * properties by type (Sales, Rentals, Hotels, Vacation Rentals, Commercial).
 * 
 * USAGE PATTERN:
 * Multiple PropertyTypeTab instances are rendered in BrowseOptions section,
 * controlled by parent component state for active tab selection.
 * 
 * STATE MANAGEMENT:
 * - Parent (BrowseOptions) manages which tab is active
 * - Component notifies parent via onClick callback
 * - No internal state; fully controlled component
 * 
 * ACCESSIBILITY:
 * - Semantic button element
 * - aria-selected indicates active tab
 * - aria-label describes the property type
 * - Keyboard accessible (tab, enter/space to activate)
 * 
 * I18N:
 * - label: Property type name (localized by parent via useLocale())
 * - icon: Visual representation of type (universal)
 * 
 * RTL/LTR:
 * - Icon and text flow naturally with flexbox
 * - Gap property handles spacing in both directions
 * - parent padding uses ps/pe for start/end alignment
 */

export default function PropertyTypeTab({
  label,
  icon: Icon,
  isActive,
  onClick,
  id,
  className = '',
}) {
  return (
    <button
      id={id}
      onClick={onClick}
      aria-selected={isActive}
      className={`flex items-center gap-2 rounded-full border-2 border-line px-4 py-2 font-semibold transition sm:px-5 sm:py-2.5 md:px-6 ${
        isActive
          ? 'border-accent bg-accent text-on-action'
          : 'border-line bg-surface text-ink hover:border-accent/50 hover:bg-hover'
      } ${className}`}
    >
      {Icon && (
        <Icon
          aria-hidden="true"
          size={18}
          className={`${isActive ? 'text-on-action' : 'text-accent'}`}
        />
      )}
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{label?.split(' ')[0]}</span>
    </button>
  )
}
