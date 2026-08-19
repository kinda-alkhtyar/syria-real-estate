import assert from 'node:assert/strict'
import test from 'node:test'

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'

import { locales } from '../src/constants/locales.js'
import { LocaleContext } from '../src/context/locale-context.js'
import { FavoritesContext } from '../src/features/favorites/favorites-context.js'
import { propertyCatalog } from '../src/features/properties/catalog/property-catalog.js'
import { PropertiesContext } from '../src/features/properties/context/properties-context.js'
import FeaturedProperties from '../src/components/home/sections/FeaturedProperties.jsx'
import { selectFeaturedProperties } from '../src/features/properties/utils/select-featured-properties.js'
import { messages } from '../src/i18n/messages/index.js'
import { translate } from '../src/i18n/translate.js'

/**
 * Listings as the API adapter emits them: the id is the owner-authored slug,
 * so it never matches the ids of the bundled sample catalogue.
 */
const apiListings = [
  {
    id: 'shop-in-mazzeh-7f21',
    href: '/properties/shop-in-mazzeh-7f21',
    image: { src: '/a.jpg', width: 960, height: 720, alt: 'Shop' },
    title: 'Shop in Mazzeh',
    location: 'Mazzeh, Damascus',
    transactionType: 'rent',
    propertyType: 'apartment',
    governorate: 'damascus',
    status: 'available',
    featured: true,
    publishedAt: '2026-08-10',
    price: { amount: 700, currency: 'USD' },
    facts: { bedrooms: 2, bathrooms: 1, areaSquareMeters: 90 },
  },
  {
    id: 'villa-in-yaafour-33ab',
    href: '/properties/villa-in-yaafour-33ab',
    image: { src: '/b.jpg', width: 960, height: 720, alt: 'Villa' },
    title: 'Villa in Yaafour',
    location: 'Yaafour, Rif Dimashq',
    transactionType: 'buy',
    propertyType: 'villa',
    governorate: 'rif-dimashq',
    status: 'available',
    featured: true,
    publishedAt: '2026-08-12',
    price: { amount: 320000, currency: 'USD' },
    facts: { bedrooms: 5, bathrooms: 4, areaSquareMeters: 400 },
  },
  {
    id: 'studio-in-tartus-91cd',
    href: '/properties/studio-in-tartus-91cd',
    image: { src: '/c.jpg', width: 960, height: 720, alt: 'Studio' },
    title: 'Studio in Tartus',
    location: 'Tartus',
    transactionType: 'rent',
    propertyType: 'apartment',
    governorate: 'tartus',
    status: 'available',
    featured: false,
    publishedAt: '2026-08-01',
    price: { amount: 300, currency: 'USD' },
    facts: { bedrooms: 1, bathrooms: 1, areaSquareMeters: 45 },
  },
]

function localeValue(code) {
  const locale = locales.find((entry) => entry.code === code)
  return {
    locale,
    setLocale() {},
    t: (key, variables) => translate(messages, code, 'en', key, variables),
  }
}

function render(properties, status = 'ready') {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(
        LocaleContext.Provider,
        { value: localeValue('ar') },
        createElement(
          FavoritesContext.Provider,
          {
            value: {
              favorites: [],
              isFavorite: () => false,
              toggleFavorite() {},
            },
          },
          createElement(
            PropertiesContext.Provider,
            { value: { properties, retry() {}, status } },
            createElement(FeaturedProperties),
          ),
        ),
      ),
    ),
  )
}

test('the desktop featured section renders API listings, not only catalogue ids', () => {
  const markup = render(apiListings)
  const emptyState = translate(
    messages,
    'ar',
    'en',
    'results.states.empty.description',
  )

  assert.ok(markup.includes('Villa in Yaafour'))
  assert.ok(markup.includes('Shop in Mazzeh'))
  assert.ok(!markup.includes(emptyState))
})

test('the flagged listings win over the merely newest ones', () => {
  const featured = selectFeaturedProperties(apiListings, 3)

  assert.deepEqual(
    featured.map((listing) => listing.id),
    ['villa-in-yaafour-33ab', 'shop-in-mazzeh-7f21'],
  )
})

test('nothing flagged falls back to the newest listings', () => {
  const unflagged = apiListings.map((listing) => ({
    ...listing,
    featured: false,
  }))
  const featured = selectFeaturedProperties(unflagged, 2)

  assert.deepEqual(
    featured.map((listing) => listing.id),
    ['villa-in-yaafour-33ab', 'shop-in-mazzeh-7f21'],
  )
})

test('the offline catalogue still resolves through its curated ids', () => {
  const featured = selectFeaturedProperties(propertyCatalog, 3)

  assert.equal(featured.length, 3)
})

test('an empty source renders the empty state rather than throwing', () => {
  const markup = render([])
  const emptyState = translate(
    messages,
    'ar',
    'en',
    'results.states.empty.description',
  )

  assert.ok(markup.includes(emptyState))
})
