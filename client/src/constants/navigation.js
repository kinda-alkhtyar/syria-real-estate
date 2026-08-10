export const navigationItems = [
  {
    labelKey: 'navigation.home',
    href: '/',
  },
  {
    labelKey: 'navigation.forSale',
    href: '/properties?transactionType=buy',
  },
  {
    labelKey: 'navigation.forRent',
    href: '/properties?transactionType=rent',
  },
  {
    labelKey: 'navigation.stays',
    href: '/properties?transactionType=stays',
  },
  /**
   * Secondary entries: kept in the desktop navigation but hidden from the
   * compact drawer, where the primary transaction links carry the journey.
   */
  {
    labelKey: 'navigation.projects',
    href: '/#featured',
    compactHidden: true,
  },
  {
    labelKey: 'navigation.about',
    href: '/#trust',
    compactHidden: true,
  },
]
