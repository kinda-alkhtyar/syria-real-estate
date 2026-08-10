/**
 * Reserves PropertyCard geometry while listing data is loading.
 *
 * @param {object} props
 * @param {string} props.label
 */
export default function PropertyCardSkeleton({ label }) {
  return (
    <div
      className="overflow-hidden rounded-3xl border border-line bg-elevated"
      role="status"
    >
      <span className="sr-only">{label}</span>
      <div
        aria-hidden="true"
        className="animate-pulse motion-reduce:animate-none"
      >
        <div className="aspect-[4/3] bg-skeleton" />
        <div className="min-h-56 p-5 sm:p-6">
          <div className="h-4 w-2/5 rounded bg-skeleton" />
          <div className="mt-4 h-6 w-4/5 rounded bg-skeleton" />
          <div className="mt-3 h-5 w-1/3 rounded bg-skeleton" />
          <div className="mt-5 flex gap-3 border-t border-line pt-4">
            <div className="h-4 w-14 rounded bg-skeleton" />
            <div className="h-4 w-14 rounded bg-skeleton" />
            <div className="h-4 w-16 rounded bg-skeleton" />
          </div>
        </div>
      </div>
    </div>
  )
}
