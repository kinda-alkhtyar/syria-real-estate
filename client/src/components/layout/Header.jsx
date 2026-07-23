import { Menu, X } from 'lucide-react'
import { useState } from 'react'

import { navigationItems } from '../../constants/navigation.js'
import LanguageSelector from '../common/LanguageSelector.jsx'
import Logo from '../common/Logo.jsx'
import Button from '../ui/Button.jsx'
import Container from '../ui/Container.jsx'
import IconButton from '../ui/IconButton.jsx'
import MobileNavigation from './MobileNavigation.jsx'

const mobileNavigationId = 'mobile-navigation'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  function closeMenu() {
    setIsMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-canvas/95 supports-[backdrop-filter]:bg-canvas/85 supports-[backdrop-filter]:backdrop-blur-xl">
      <Container>
        <div className="flex min-h-18 items-center justify-between gap-3">
          <Logo />

          <nav aria-label="Primary navigation" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {navigationItems.map((item) => (
                <li key={item.href}>
                  <a
                    className="inline-flex min-h-11 items-center rounded-full px-3.5 text-sm font-semibold text-muted transition hover:bg-white hover:text-ink motion-reduce:transition-none xl:px-4"
                    href={item.href}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <LanguageSelector compact />
            <Button href="#login" variant="quiet">
              Log in
            </Button>
            <Button href="#list-property">Add property</Button>
          </div>

          <IconButton
            aria-controls={mobileNavigationId}
            aria-expanded={isMenuOpen}
            className="lg:hidden"
            label={isMenuOpen ? 'Close navigation' : 'Open navigation'}
            onClick={() => setIsMenuOpen((currentValue) => !currentValue)}
          >
            {isMenuOpen ? (
              <X aria-hidden="true" size={21} />
            ) : (
              <Menu aria-hidden="true" size={21} />
            )}
          </IconButton>
        </div>

        <MobileNavigation
          id={mobileNavigationId}
          isOpen={isMenuOpen}
          items={navigationItems}
          onNavigate={closeMenu}
        />
      </Container>
    </header>
  )
}
