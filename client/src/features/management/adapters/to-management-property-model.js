import { formatCurrency } from '../../properties/utils/property-formatters.js'

const localeSuffix = { ar: 'Ar', de: 'De', en: 'En' }
const governorateKeys = {
  AL_HASAKAH: 'alHasakah',
  AS_SUWAYDA: 'asSuwayda',
  DEIR_EZ_ZOR: 'deirEzZor',
  RIF_DIMASHQ: 'rifDimashq',
}

function localized(record, field, localeCode) {
  const suffix = localeSuffix[localeCode] ?? localeSuffix.en
  return record[`${field}${suffix}`] || record[`${field}En`] || ''
}

function normalizedKey(value) {
  return value.toLowerCase()
}

function governorateKey(value) {
  return governorateKeys[value] ?? normalizedKey(value)
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

  return {
    id: record.id,
    slug: record.slug,
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
    status: normalizedKey(record.status),
    statusLabel: t(`listingStatuses.${normalizedKey(record.status)}`),
    price: formatCurrency(
      Number(record.price),
      record.currency,
      localeCode,
    ),
    updatedAt: new Intl.DateTimeFormat(localeCode, {
      dateStyle: 'medium',
    }).format(new Date(record.updatedAt)),
    image: primaryImage
      ? {
          alt:
            localized(primaryImage, 'alt', localeCode) ||
            localized(record, 'title', localeCode),
          height: primaryImage.height ?? 720,
          src: primaryImage.url,
          width: primaryImage.width ?? 960,
        }
      : null,
  }
}
