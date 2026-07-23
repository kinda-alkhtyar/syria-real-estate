import { Mail, MapPin } from 'lucide-react'

import { navigationItems } from '../../constants/navigation.js'
import Logo from '../common/Logo.jsx'
import Container from '../ui/Container.jsx'

export default function Footer() {
  return (
    <footer className="border-t border-line bg-white">
      <Container className="py-12 sm:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div className="max-w-md">
            <Logo />
            <p className="mt-4 text-sm leading-7 text-muted">
              A modern, trustworthy property marketplace designed around the
              needs and locations of Syria.
            </p>
          </div>

          <div>
            <h2 className="text-sm font-bold text-ink">Explore</h2>
            <ul className="mt-4 grid gap-3">
              {navigationItems.slice(0, 4).map((item) => (
                <li key={item.href}>
                  <a
                    className="text-sm text-muted hover:text-ink"
                    href={item.href}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-bold text-ink">Contact</h2>
            <ul className="mt-4 grid gap-3 text-sm text-muted">
              <li className="flex items-start gap-2">
                <MapPin aria-hidden="true" className="mt-0.5" size={17} />
                <span>Serving communities across Syria</span>
              </li>
              <li className="flex items-start gap-2">
                <Mail aria-hidden="true" className="mt-0.5" size={17} />
                <span>Contact details coming soon</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-line pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Dar Syria. Product foundation preview.</p>
          <p>Arabic · English · Deutsch</p>
        </div>
      </Container>
    </footer>
  )
}
