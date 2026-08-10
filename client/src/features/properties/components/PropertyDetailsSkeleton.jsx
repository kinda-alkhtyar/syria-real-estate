import Container from '../../../components/ui/Container.jsx'

export default function PropertyDetailsSkeleton({ label }) {
  return (
    <section aria-label={label} className="bg-canvas lg:py-8" role="status">
      {/* Phone shape mirrors the mobile detail screen, not the desktop grid. */}
      <div
        aria-hidden="true"
        className="animate-pulse motion-reduce:animate-none lg:hidden"
      >
        <div className="aspect-[4/3] bg-skeleton" />
        <div className="bg-home-panel px-4 pb-5 pt-4">
          <div className="h-6 w-32 rounded bg-skeleton" />
          <div className="mt-2.5 h-4 w-52 rounded bg-skeleton" />
          <div className="mt-2.5 h-3 w-36 rounded bg-skeleton" />
          <div className="mt-4 flex gap-2">
            <div className="h-8 w-[70px] rounded-[10px] bg-skeleton" />
            <div className="h-8 w-[70px] rounded-[10px] bg-skeleton" />
            <div className="h-8 w-[70px] rounded-[10px] bg-skeleton" />
          </div>
          <div className="mt-5 space-y-2">
            <div className="h-3 w-full rounded bg-skeleton" />
            <div className="h-3 w-full rounded bg-skeleton" />
            <div className="h-3 w-8/12 rounded bg-skeleton" />
          </div>
        </div>
        <div className="flex gap-2.5 border-t border-home-card-border bg-home-panel px-4 py-3">
          <div className="size-13 shrink-0 rounded-[14px] bg-skeleton" />
          <div className="h-13 flex-1 rounded-[14px] bg-skeleton" />
        </div>
      </div>

      <div className="hidden lg:block">
        <Container>
          <div
            aria-hidden="true"
            className="grid animate-pulse gap-8 motion-reduce:animate-none lg:grid-cols-[minmax(0,1fr)_22rem]"
          >
            <div>
              <div className="aspect-[4/3] rounded-3xl bg-skeleton" />
              <div className="mt-8 h-8 w-3/4 rounded bg-skeleton" />
              <div className="mt-4 h-5 w-1/2 rounded bg-skeleton" />
              <div className="mt-8 h-48 rounded-2xl bg-skeleton" />
            </div>
            <div className="h-80 rounded-2xl bg-skeleton" />
          </div>
        </Container>
      </div>
    </section>
  )
}
