/**
 * Reserves `ResultRowCard` geometry while listing data is loading.
 *
 * @param {object} props
 * @param {string} props.label
 */
export default function ResultRowSkeleton({ label }) {
  return (
    <div
      className="flex gap-3 overflow-hidden rounded-[16px] border border-home-card-border bg-home-panel p-2.5"
      role="status"
    >
      <span className="sr-only">{label}</span>
      <div
        aria-hidden="true"
        className="flex w-full animate-pulse gap-3 motion-reduce:animate-none"
      >
        <div className="size-24 shrink-0 rounded-[12px] bg-skeleton" />
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
          <div className="h-3 w-4/5 rounded bg-skeleton" />
          <div className="h-4 w-2/5 rounded bg-skeleton" />
          <div className="h-3 w-1/2 rounded bg-skeleton" />
          <div className="h-3 w-1/3 rounded bg-skeleton" />
        </div>
      </div>
    </div>
  )
}
