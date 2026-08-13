import { governorateLabel } from '../../../constants/governorate-keys.js'
import { propertyCatalog } from '../catalog/property-catalog.js'

const transactionTypes = {
  BUY: 'buy',
  RENT: 'rent',
  STAY: 'stays',
}

const governorates = {
  RIF_DIMASHQ: 'rif-dimashq',
  AS_SUWAYDA: 'as-suwayda',
  AL_HASAKAH: 'al-hasakah',
  DEIR_EZ_ZOR: 'deir-ez-zor',
}

const localeSuffixes = { ar: 'Ar', de: 'De', en: 'En' }

function localizedValue(record, field, localeCode) {
  const suffix = localeSuffixes[localeCode] ?? localeSuffixes.en
  return record[`${field}${suffix}`] ?? record[`${field}En`] ?? ''
}

// Owners write the description — and an image alt text — once, in the language
// they list in, so a viewer browsing in another language would otherwise see
// nothing at all. The active locale wins; failing that the first translation
// that carries text.
const translationFallbackOrder = ['ar', 'en', 'de']

function localizedWithFallback(record, field, localeCode) {
  for (const code of [localeCode, ...translationFallbackOrder]) {
    const suffix = localeSuffixes[code]
    if (!suffix) continue
    const value = record[`${field}${suffix}`]
    if (typeof value === 'string' && value.trim()) return value
  }
  return ''
}

function asNumber(value) {
  if (value === null || value === undefined) return undefined
  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}

/**
 * The free-text parts of an address, narrowest first. The governorate is
 * deliberately absent: it is an enum, and only a caller holding the message
 * catalogue can name it in the language being read.
 */
function locationParts(property) {
  return [property.neighborhood, property.district, property.city].filter(
    Boolean,
  )
}

/**
 * The location line as displayed. An editorial listing carries an authored line
 * that is already translated; every other listing is composed from what the
 * owner typed plus the governorate resolved through the catalogue, the same way
 * the management list composes it. A part that only repeats the governorate — a
 * Damascus listing whose city is also Damascus — is dropped instead of printed
 * twice.
 */
export function propertyLocationLabel(listing, t) {
  if (listing.locationKey) return t(listing.locationKey)

  return [
    ...(listing.locationParts ?? []),
    governorateLabel(listing.governorateValue, t),
  ]
    .filter(Boolean)
    .filter((part, index, all) => all.indexOf(part) === index)
    .join(', ')
}

const loopbackHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]', '::1'])

/**
 * A stored URL that points at a loopback host only resolves on the machine that
 * uploaded it, so it renders as a broken image on a phone or any other device.
 * Such URLs are treated as unusable: the bundled editorial image is preferred,
 * and without one the origin is retargeted at the host currently being browsed.
 */
function usableImageUrl(url) {
  if (!url || !/^https?:\/\//i.test(url)) return url ?? ''

  let parsed
  try {
    parsed = new URL(url)
  } catch {
    return url
  }
  if (!loopbackHosts.has(parsed.hostname)) return url
  if (typeof window === 'undefined') return ''

  const { hostname } = window.location
  if (loopbackHosts.has(hostname)) return url

  parsed.hostname = hostname
  parsed.protocol = window.location.protocol
  return parsed.toString()
}

function isLoopbackUrl(url) {
  if (!/^https?:\/\//i.test(url ?? '')) return false
  try {
    return loopbackHosts.has(new URL(url).hostname)
  } catch {
    return false
  }
}

function adaptImage(image, localeCode, staticImage) {
  // Relative URLs already resolve against whichever host serves the app, so only
  // absolute non-loopback URLs are kept as authored.
  const isRemote =
    /^https?:\/\//i.test(image?.url ?? '') && !isLoopbackUrl(image?.url)

  if (!isRemote && staticImage) {
    return {
      ...staticImage,
      altKey: staticImage.altKey,
      alt: localizedWithFallback(image ?? {}, 'alt', localeCode) || undefined,
    }
  }

  return {
    src: usableImageUrl(image?.url) || staticImage?.src || '',
    width: image?.width ?? staticImage?.width ?? 960,
    height: image?.height ?? staticImage?.height ?? 720,
    alt: localizedWithFallback(image ?? {}, 'alt', localeCode),
    altKey: staticImage?.altKey,
  }
}

/**
 * Keeps the API authoritative for listing data. Static entries contribute only
 * presentation metadata that is not represented by the current API schema.
 */
export function fromPropertyApi(property, localeCode) {
  const editorial = propertyCatalog.find(
    (listing) => listing.id === property.slug,
  )
  const images = (property.images ?? []).map((image, index) =>
    adaptImage(image, localeCode, index === 0 ? editorial?.image : undefined),
  )
  const image =
    images[0] ?? adaptImage(undefined, localeCode, editorial?.image)

  return {
    id: property.slug,
    apiId: property.id,
    href: `/properties/${property.slug}`,
    image,
    images: images.length > 0 ? images : [image],
    title: localizedValue(property, 'title', localeCode),
    description: localizedWithFallback(property, 'description', localeCode),
    locationParts: editorial ? undefined : locationParts(property),
    locationKey: editorial?.locationKey,
    // The raw enum, kept alongside the slug form above: `governorate` is the
    // value filters and URLs use, while the message keys derive from the enum.
    governorateValue: property.governorate,
    transactionType:
      transactionTypes[property.transaction] ??
      property.transaction.toLowerCase(),
    propertyType: property.propertyType.toLowerCase(),
    governorate:
      governorates[property.governorate] ??
      property.governorate.toLowerCase().replaceAll('_', '-'),
    status: property.status.toLowerCase(),
    // Optional seller contact. Absent on editorial catalog entries, which is why
    // every consumer treats an empty value as "no contact buttons".
    whatsapp: property.whatsapp ?? '',
    featured: property.featured === true,
    publishedAt: property.createdAt,
    price: {
      amount: asNumber(property.price) ?? 0,
      currency: property.currency,
      periodKey: editorial?.price.periodKey,
    },
    facts: {
      bedrooms: property.bedrooms ?? undefined,
      bathrooms: property.bathrooms ?? undefined,
      areaSquareMeters: asNumber(property.area),
    },
    features: editorial?.features ?? [],
    amenities: editorial?.amenities ?? [],
    information: editorial?.information,
  }
}
