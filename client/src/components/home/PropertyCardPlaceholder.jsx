import { ArrowUpRight, Building } from 'lucide-react'

export default function PropertyCardPlaceholder({ property }) {
  return (
    <article className="group min-w-0 overflow-hidden rounded-3xl border border-line bg-white transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(25,45,38,0.1)] motion-reduce:transform-none motion-reduce:transition-none">
      <div className="property-placeholder relative aspect-[4/3] overflow-hidden border-b border-line">
        <span className="absolute start-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-ink shadow-sm">
          Preview
        </span>
        <Building
          aria-hidden="true"
          className="absolute bottom-5 end-5 text-ink/25"
          size={42}
          strokeWidth={1.2}
        />
      </div>
      <div className="p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">
          {property.eyebrow}
        </p>
        <h3 className="mt-2 text-xl font-semibold tracking-[-0.025em] text-ink">
          {property.title}
        </h3>
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
          <p className="text-sm text-muted">{property.detail}</p>
          <span
            aria-hidden="true"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-stone-soft text-ink transition group-hover:bg-ink group-hover:text-white motion-reduce:transition-none"
          >
            <ArrowUpRight className="rtl:-scale-x-100" size={17} />
          </span>
        </div>
      </div>
    </article>
  )
}
