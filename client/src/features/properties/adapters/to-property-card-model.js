import {
  formatArea,
  formatCurrency,
  formatNumber,
} from '../utils/property-formatters.js'

const factDefinitions = [
  { key: 'bedrooms', type: 'bedrooms' },
  { key: 'bathrooms', type: 'bathrooms' },
  { key: 'areaSquareMeters', type: 'area' },
]

/**
 * Converts locale-independent listing data into a presentation-ready card model.
 *
 * @param {object} listing
 * @param {string} localeCode
 * @param {(key: string, variables?: object) => string} t
 * @returns {object}
 */
export function toPropertyCardModel(listing, localeCode, t) {
  const title = listing.title ?? t(listing.titleKey)
  const period = listing.price.periodKey
    ? ` ${t(listing.price.periodKey)}`
    : ''

  const facts = factDefinitions.flatMap(({ key, type }) => {
    const value = listing.facts[key]

    if (value === undefined || value === null) {
      return []
    }

    return [
      {
        type,
        label: t(`propertyFacts.${type}`),
        value:
          type === 'area'
            ? formatArea(value, localeCode, t)
            : formatNumber(value, localeCode),
      },
    ]
  })

  return {
    id: listing.id,
    href: listing.href,
    image: {
      src: listing.image.src,
      width: listing.image.width,
      height: listing.image.height,
      alt: listing.image.alt ?? t(listing.image.altKey),
    },
    listingType: t(`transactionTypes.${listing.transactionType}`),
    transactionType: listing.transactionType,
    propertyType: listing.propertyType,
    title,
    location: listing.location ?? t(listing.locationKey),
    price: `${formatCurrency(
      listing.price.amount,
      listing.price.currency,
      localeCode,
    )}${period}`,
    favoriteLabel: t('accessibility.addToFavorites', { title }),
    favoriteRemoveLabel: t('accessibility.removeFromFavorites', { title }),
    facts,
  }
}
