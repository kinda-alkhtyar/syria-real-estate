import { CheckCircle2, MapPin, ShieldCheck } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'

import Button from '../ui/Button.jsx'
import Container from '../ui/Container.jsx'
import PropertySearch from './PropertySearch.jsx'

export default function HeroSection() {
  const prefersReducedMotion = useReducedMotion()
  const initialMotion = prefersReducedMotion ? false : { opacity: 0, y: 16 }

  return (
    <section className="relative overflow-hidden bg-canvas py-10 sm:py-14 lg:py-18">
      <Container>
        <div className="grid min-w-0 items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            initial={initialMotion}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          >
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent-soft px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-ink">
              <ShieldCheck aria-hidden="true" size={16} />
              Property decisions with confidence
            </p>
            <h1 className="max-w-3xl text-balance text-[clamp(2.5rem,7vw,5.75rem)] font-semibold leading-[0.98] tracking-[-0.055em] text-ink">
              A clearer way to find your place in Syria.
            </h1>
            <p className="mt-6 max-w-2xl text-pretty text-base leading-7 text-muted sm:text-lg sm:leading-8">
              Explore quality-focused homes and opportunities through
              structured locations, transparent currencies, and a marketplace
              built for trust.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button href="#search">Explore properties</Button>
              <Button href="#trust" variant="secondary">
                How trust works
              </Button>
            </div>
          </motion.div>

          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className="relative min-h-80 overflow-hidden rounded-[2rem] border border-line bg-ink p-5 text-white shadow-[0_32px_80px_rgba(25,45,38,0.18)] sm:min-h-105 sm:p-7"
            initial={
              prefersReducedMotion ? false : { opacity: 0, scale: 0.985 }
            }
            transition={{ duration: 0.6, delay: 0.08, ease: 'easeOut' }}
          >
            <div className="absolute inset-0 opacity-80 hero-pattern" />
            <div className="relative flex h-full min-h-[inherit] flex-col justify-between gap-10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-sand">
                    Built around place
                  </p>
                  <p className="mt-2 max-w-xs text-2xl font-semibold leading-tight">
                    From governorate to neighborhood.
                  </p>
                </div>
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-white/10">
                  <MapPin aria-hidden="true" size={20} />
                </span>
              </div>

              <div className="ms-auto w-full max-w-sm rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
                <p className="text-sm text-white/70">A trustworthy foundation</p>
                <ul className="mt-4 grid gap-3 text-sm font-semibold">
                  <li className="flex items-center gap-2">
                    <CheckCircle2
                      aria-hidden="true"
                      className="text-sand"
                      size={18}
                    />
                    Moderation-ready architecture
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2
                      aria-hidden="true"
                      className="text-sand"
                      size={18}
                    />
                    Arabic-first direction support
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2
                      aria-hidden="true"
                      className="text-sand"
                      size={18}
                    />
                    Explicit USD and SYP display
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="relative z-10 mt-8 lg:-mt-10 lg:w-[92%]">
          <PropertySearch />
        </div>
      </Container>
    </section>
  )
}
