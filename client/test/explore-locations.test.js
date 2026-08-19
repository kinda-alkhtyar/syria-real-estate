import assert from 'node:assert/strict'
import test from 'node:test'

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { locales } from '../src/constants/locales.js'
import { syrianGovernorates } from '../src/constants/syrian-governorates.js'
import { LocaleContext } from '../src/context/locale-context.js'
import ExploreLocations from '../src/components/home/sections/ExploreLocations.jsx'
import { PropertiesContext } from '../src/features/properties/context/properties-context.js'
import { messages } from '../src/i18n/messages/index.js'
import { translate } from '../src/i18n/translate.js'

const promotedCities = ['damascus', 'aleppo', 'latakia']

/** Only Damascus is published, so the other two cities have no listing cover. */
const sparseListings = [
  {
    id: 'shop-in-mazzeh-7f21',
    href: '/properties/shop-in-mazzeh-7f21',
    image: { src: '/mazzeh.jpg', width: 960, height: 720, alt: 'Shop' },
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
]

function render(properties, status = 'ready') {
  const locale = locales.find((entry) => entry.code === 'ar')
  return renderToStaticMarkup(
    createElement(
      LocaleContext.Provider,
      {
        value: {
          locale,
          setLocale() {},
          t: (key, variables) => translate(messages, 'ar', 'en', key, variables),
        },
      },
      createElement(
        PropertiesContext.Provider,
        { value: { properties, retry() {}, status } },
        createElement(ExploreLocations),
      ),
    ),
  )
}

function cityLabel(id) {
  const governorate = syrianGovernorates.find((option) => option.id === id)
  return translate(messages, 'ar', 'en', governorate.labelKey)
}

test('the section promotes three cities, the third among them Latakia', () => {
  const markup = render(sparseListings)

  for (const id of promotedCities) {
    assert.ok(
      markup.includes(cityLabel(id)),
      `${id} is missing from the section`,
    )
  }
  assert.equal(cityLabel('latakia'), 'اللاذقية')
})

test('a city with nothing published still gets a card and a cover', () => {
  const markup = render(sparseListings)
  const cards = markup.match(/<a class="group relative/g) ?? []
  const images = markup.match(/<img [^>]*src="[^"]+"/g) ?? []

  assert.equal(cards.length, 3)
  assert.equal(images.length, 3)
})

test('every city card links into the catalogue filtered by its governorate', () => {
  const markup = render(sparseListings)

  for (const id of promotedCities) {
    assert.ok(markup.includes(`/properties?governorate=${id}`))
  }
})

test('a cover with no listing behind it is still described', () => {
  const markup = render(sparseListings)
  const expected = translate(messages, 'ar', 'en', 'locations.cardImageAlt', {
    city: cityLabel('latakia'),
  })

  assert.ok(markup.includes(expected))
  assert.ok(!markup.includes('alt=""'))
})

test('a published listing supplies the cover for its own city', () => {
  const markup = render(sparseListings)

  assert.ok(markup.includes('/mazzeh.jpg'))
})

test('the cities survive an empty or failed properties source', () => {
  for (const [properties, status] of [
    [[], 'ready'],
    [[], 'error'],
  ]) {
    const markup = render(properties, status)
    for (const id of promotedCities) {
      assert.ok(markup.includes(cityLabel(id)), `${id} missing at ${status}`)
    }
  }
})
