import { ArrowUpRight } from 'lucide-react'

import MobileHome from '../components/home/mobile/MobileHome.jsx'
import ExploreLocations from '../components/home/sections/ExploreLocations.jsx'
import FeaturedProperties from '../components/home/sections/FeaturedProperties.jsx'
import HeroSection from '../components/home/sections/HeroSection.jsx'
import TrustStats from '../components/home/sections/TrustStats.jsx'
import Button from '../components/ui/Button.jsx'
import Container from '../components/ui/Container.jsx'
import { useLocale } from '../hooks/useLocale.js'

function ListPropertyCta() {
  const { t } = useLocale()

  return (
    <section className="bg-home-band py-16 sm:py-20 lg:py-24 xl:min-h-[420px]! xl:py-0 xl:pt-[82px]! xl:pb-[74px]!">
      <Container className="lg:px-20 xl:w-[min(1280px,calc(100%-160px))]! xl:px-0!">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:rtl:[direction:rtl] xl:flex-col! xl:items-start! xl:gap-0!">
          <div className="max-w-2xl text-start xl:max-w-none!">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-home-gold xl:max-w-[600px]! xl:text-[16px]! xl:font-medium! xl:normal-case! xl:leading-[22px]! xl:tracking-normal">
              {t('homepage.cta.eyebrow')}
            </p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-home-band-text sm:text-4xl xl:mt-[20px]! xl:max-w-[700px]! xl:text-[40px]! xl:leading-[56px]!">
              {t('homepage.cta.title')}
            </h2>
            <p className="mt-4 text-base leading-7 text-home-band-text/80 sm:text-lg xl:mt-[20px]! xl:max-w-[800px]! xl:text-[18px]! xl:font-semibold! xl:leading-[28px]!">
              {t('homepage.cta.description')}
            </p>
          </div>
          <Button
            className="min-h-12 rounded-full border-transparent bg-home-gold! px-7 py-3 text-[0.95rem] text-home-on-gold! shadow-none! hover:border-transparent hover:bg-home-gold-hover! xl:mt-[62px]! xl:h-[56px]! xl:min-h-[56px]! xl:w-[230px]! xl:shrink-0 xl:rounded-[12px]! xl:p-[10px]! xl:text-[18px]! xl:font-semibold! xl:leading-[28px]!"
            href="/dashboard/properties/new"
            variant="secondary"
          >
            {t('homepage.cta.action')}
            <ArrowUpRight aria-hidden="true" className="xl:hidden" size={18} />
          </Button>
        </div>
      </Container>
    </section>
  )
}

/**
 * Composes the public homepage without owning feature or presentation logic.
 *
 * Phones and portrait tablets get the search-first app layout; from `lg`
 * upwards the approved marketing composition renders unchanged.
 */
export default function HomePage() {
  return (
    <>
      <div className="lg:hidden">
        <MobileHome />
      </div>
      <div className="hidden lg:block">
        <HeroSection />
        <FeaturedProperties />
        <ExploreLocations />
        <TrustStats />
        <ListPropertyCta />
      </div>
    </>
  )
}
