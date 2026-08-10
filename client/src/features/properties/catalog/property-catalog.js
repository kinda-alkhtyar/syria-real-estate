import aleppoVilla from '../../../assets/properties/aleppo-villa.jpg'
import damascusCourtyard from '../../../assets/properties/damascus-courtyard.jpg'
import latakiaApartment from '../../../assets/properties/latakia-apartment.jpg'

/**
 * Current publishable property catalog.
 * The stable shape is the boundary consumed by selectors and adapters.
 */
export const propertyCatalog = [
  {
    id: 'damascus-courtyard',
    href: '/properties/damascus-courtyard',
    image: {
      src: damascusCourtyard,
      width: 960,
      height: 720,
      altKey: 'featured.listings.damascus.imageAlt',
    },
    titleKey: 'featured.listings.damascus.title',
    locationKey: 'featured.listings.damascus.location',
    transactionType: 'buy',
    propertyType: 'house',
    governorate: 'damascus',
    status: 'available',
    publishedAt: '2026-07-22',
    price: { amount: 245000, currency: 'USD' },
    facts: { bedrooms: 4, bathrooms: 3, areaSquareMeters: 310 },
    descriptionKey: 'propertyDetails.listings.damascus.description',
    features: ['courtyard', 'restoredStone', 'privateEntrance'],
    amenities: ['heating', 'airConditioning', 'furnished'],
    information: {
      yearBuilt: 1920,
      floors: 2,
      reference: 'DS-1001',
    },
  },
  {
    id: 'latakia-apartment',
    href: '/properties/latakia-apartment',
    image: {
      src: latakiaApartment,
      width: 960,
      height: 720,
      altKey: 'featured.listings.latakia.imageAlt',
    },
    titleKey: 'featured.listings.latakia.title',
    locationKey: 'featured.listings.latakia.location',
    transactionType: 'rent',
    propertyType: 'apartment',
    governorate: 'latakia',
    status: 'available',
    publishedAt: '2026-07-20',
    price: { amount: 950, currency: 'USD', periodKey: 'pricing.month' },
    facts: { bedrooms: 2, bathrooms: 2, areaSquareMeters: 145 },
    descriptionKey: 'propertyDetails.listings.latakia.description',
    features: ['seaView', 'balcony', 'elevator'],
    amenities: ['heating', 'airConditioning', 'parking'],
    information: {
      yearBuilt: 2021,
      floors: 1,
      reference: 'DS-1002',
    },
  },
  {
    id: 'aleppo-villa',
    href: '/properties/aleppo-villa',
    image: {
      src: aleppoVilla,
      width: 960,
      height: 720,
      altKey: 'featured.listings.aleppo.imageAlt',
    },
    titleKey: 'featured.listings.aleppo.title',
    locationKey: 'featured.listings.aleppo.location',
    transactionType: 'stays',
    propertyType: 'villa',
    governorate: 'aleppo',
    status: 'reserved',
    publishedAt: '2026-07-18',
    price: { amount: 135, currency: 'USD', periodKey: 'pricing.night' },
    facts: { bedrooms: 3, bathrooms: 2, areaSquareMeters: 220 },
    descriptionKey: 'propertyDetails.listings.aleppo.description',
    features: ['garden', 'terrace', 'privateEntrance'],
    amenities: ['heating', 'airConditioning', 'parking'],
    information: {
      yearBuilt: 2019,
      floors: 2,
      reference: 'DS-1003',
    },
  },
]

export const featuredPropertyIds = [
  'damascus-courtyard',
  'latakia-apartment',
  'aleppo-villa',
]
