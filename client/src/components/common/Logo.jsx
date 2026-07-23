import { Building2 } from 'lucide-react'

export default function Logo() {
  return (
    <a
      aria-label="Dar Syria home"
      className="inline-flex min-h-11 items-center gap-2.5 rounded-lg text-ink"
      href="/"
    >
      <span
        aria-hidden="true"
        className="inline-flex size-9 items-center justify-center rounded-xl bg-ink text-white"
      >
        <Building2 size={19} strokeWidth={1.8} />
      </span>
      <span className="whitespace-nowrap text-lg font-bold tracking-[-0.03em]">
        Dar Syria
      </span>
    </a>
  )
}
