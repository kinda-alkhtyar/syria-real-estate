import { governorateKey } from '../../../constants/governorate-keys.js'
import { formatCurrency } from '../../properties/utils/property-formatters.js'
import {
  isAwaitingReview,
  isRejected,
  listingStatusChipClass,
} from '../constants/listing-status-presentation.js'

const localeSuffix = { ar: 'Ar', de: 'De', en: 'En' }

function localized(record, field, localeCode) {
  const suffix = localeSuffix[localeCode] ?? localeSuffix.en
  return record[`${field}${suffix}`] || record[`${field}En`] || ''
}

// An image is described once, in the language it was uploaded in, so the alt
// text of another language would otherwise be empty. The active locale wins;
// failing that the first translation that carries text.
const altFallbackOrder = ['ar', 'en', 'de']

function localizedAlt(image, localeCode) {
  for (const code of [localeCode, ...altFallbackOrder]) {
    const suffix = localeSuffix[code]
    if (!suffix) continue
    const value = image[`alt${suffix}`]
    if (typeof value === 'string' && value.trim()) return value
  }
  return ''
}

function normalizedKey(value) {
  return value.toLowerCase()
}

export function toManagementPropertyModel(record, localeCode, t) {
  const location = [
    record.neighborhood,
    record.district,
    record.city,
    t(`governorates.${governorateKey(record.governorate)}`),
  ]
    .filter(Boolean)
    .join(', ')
  const primaryImage = record.images?.[0]
  const status = normalizedKey(record.status)
  const dateFormat = new Intl.DateTimeFormat(localeCode, {
    dateStyle: 'medium',
  })

  return {
    id: record.id,
    slug: record.slug,
    governorate: t(`governorates.${governorateKey(record.governorate)}`),
    title: localized(record, 'title', localeCode),
    location,
    transaction: t(
      `transactionTypes.${
        record.transaction === 'STAY'
          ? 'stays'
          : normalizedKey(record.transaction)
      }`,
    ),
    propertyType: t(
      `propertyTypes.${normalizedKey(record.propertyType)}`,
    ),
    status,
    statusLabel: t(`listingStatuses.${status}`),
    statusChipClass: listingStatusChipClass(status),
    awaitingReview: isAwaitingReview(status),
    rejected: isRejected(status),
    // Present only on a rejected listing; the API sends null otherwise.
    rejectionReason: record.rejectionReason ?? '',
    price: formatCurrency(
      Number(record.price),
      record.currency,
      localeCode,
    ),
    createdAt: record.createdAt
      ? dateFormat.format(new Date(record.createdAt))
      : '',
    updatedAt: dateFormat.format(new Date(record.updatedAt)),
    image: primaryImage
      ? {
          alt:
            localizedAlt(primaryImage, localeCode) ||
            localized(record, 'title', localeCode),
          height: primaryImage.height ?? 720,
          src: primaryImage.url,
          width: primaryImage.width ?? 960,
        }
      : null,
  }
}
