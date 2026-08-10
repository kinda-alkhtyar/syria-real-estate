export const propertyCreationInitialValues = Object.freeze({
  titleEn: '',
  titleAr: '',
  titleDe: '',
  descriptionEn: '',
  descriptionAr: '',
  descriptionDe: '',
  transaction: 'buy',
  propertyType: 'apartment',
  status: 'draft',
  price: '',
  currency: 'usd',
  governorate: 'damascus',
  city: '',
  district: '',
  neighborhood: '',
  address: '',
  bedrooms: '',
  bathrooms: '',
  area: '',
  latitude: '',
  longitude: '',
  whatsapp: '',
  featured: false,
})

export const propertyCreationOptions = Object.freeze({
  currencies: ['usd', 'eur', 'syp'],
  governorates: [
    'damascus',
    'rif_dimashq',
    'aleppo',
    'latakia',
    'homs',
    'hama',
    'idlib',
    'tartus',
    'daraa',
    'as_suwayda',
    'raqqa',
    'al_hasakah',
    'deir_ez_zor',
    'quneitra',
  ],
  propertyTypes: [
    'apartment',
    'house',
    'villa',
    'land',
    'commercial',
    'office',
  ],
  statuses: ['draft', 'available', 'reserved', 'sold', 'rented', 'archived'],
  transactions: ['buy', 'rent', 'stay'],
})

const requiredTextFields = [
  'titleEn',
  'titleAr',
  'titleDe',
  'city',
]
const decimalFields = ['price', 'area']
const optionalDecimalFields = ['latitude', 'longitude']
const integerFields = ['bedrooms', 'bathrooms']
const knownFields = new Set(Object.keys(propertyCreationInitialValues))

// Mirrors the server rule: digits and spaces with at most one leading `+`, and
// a digit count a real number can actually have. Kept optional — a blank field
// clears any stored number.
const whatsappPattern = /^\+?\d[\d ]*$/

export function isValidWhatsappNumber(value) {
  const trimmed = value.trim()
  if (!whatsappPattern.test(trimmed)) return false
  const digits = trimmed.replace(/\D/g, '').length
  return digits >= 6 && digits <= 15
}

export function validatePropertyCreation(values) {
  const errors = {}
  for (const field of requiredTextFields) {
    if (!values[field]?.trim()) errors[field] = 'required'
  }
  for (const field of decimalFields) {
    const number = Number(values[field])
    if (values[field] === '') errors[field] = 'required'
    else if (!Number.isFinite(number) || number < 0) errors[field] = 'number'
  }
  if (values.area !== '' && Number(values.area) <= 0) {
    errors.area = 'positive'
  }
  for (const field of integerFields) {
    if (
      values[field] !== '' &&
      (!Number.isInteger(Number(values[field])) ||
        Number(values[field]) < 0 ||
        Number(values[field]) > 100)
    ) {
      errors[field] = 'integer'
    }
  }
  for (const field of optionalDecimalFields) {
    if (values[field] !== '' && !Number.isFinite(Number(values[field]))) {
      errors[field] = 'number'
    }
  }
  if (
    values.latitude !== '' &&
    (Number(values.latitude) < -90 || Number(values.latitude) > 90)
  ) {
    errors.latitude = 'latitude'
  }
  if (
    values.longitude !== '' &&
    (Number(values.longitude) < -180 || Number(values.longitude) > 180)
  ) {
    errors.longitude = 'longitude'
  }
  if (
    values.whatsapp.trim() !== '' &&
    !isValidWhatsappNumber(values.whatsapp)
  ) {
    errors.whatsapp = 'whatsapp'
  }
  return errors
}

function optionalText(payload, values, field) {
  const value = values[field].trim()
  if (value) payload[field] = value
}

function optionalNumber(payload, values, field) {
  if (values[field] !== '') payload[field] = Number(values[field])
}

export function toPropertyCreationPayload(
  values,
  { includeFeatured = false } = {},
) {
  const payload = {
    titleEn: values.titleEn.trim(),
    titleAr: values.titleAr.trim(),
    titleDe: values.titleDe.trim(),
    transaction: values.transaction,
    propertyType: values.propertyType,
    status: values.status,
    price: values.price.trim(),
    currency: values.currency,
    governorate: values.governorate,
    city: values.city.trim(),
    area: values.area.trim(),
    // Always sent, unlike the other optional text fields: an owner who clears
    // the field means "remove my number", and `null` is what erases it.
    whatsapp: values.whatsapp.trim() || null,
  }
  // `featured` is administrator-only. The key is omitted entirely rather than
  // sent as false, because the OWNER API schema rejects any unknown key.
  if (includeFeatured) payload.featured = Boolean(values.featured)
  for (const field of [
    'descriptionEn',
    'descriptionAr',
    'descriptionDe',
    'district',
    'neighborhood',
    'address',
  ]) {
    optionalText(payload, values, field)
  }
  for (const field of [
    'bedrooms',
    'bathrooms',
    'latitude',
    'longitude',
  ]) {
    optionalNumber(payload, values, field)
  }
  return payload
}

export function parsePropertyCreationErrors(message) {
  if (typeof message !== 'string') return {}
  const errors = {}
  for (const segment of message.split(';')) {
    const separator = segment.indexOf(':')
    if (separator < 1) continue
    const field = segment.slice(0, separator).trim()
    const detail = segment.slice(separator + 1).trim()
    if (knownFields.has(field) && detail && !errors[field]) {
      errors[field] = detail
    }
  }
  return errors
}

export function isPropertyCreationDirty(
  values,
  baseline = propertyCreationInitialValues,
) {
  return Object.keys(propertyCreationInitialValues).some(
    (field) => values[field] !== baseline[field],
  )
}

function textValue(value) {
  return value ?? ''
}

function numberValue(value) {
  return value === null || value === undefined ? '' : String(value)
}

function optionValue(value) {
  return typeof value === 'string' ? value.toLowerCase() : ''
}

/**
 * Maps a management list record onto form values.
 *
 * The management endpoint does not return descriptions, coordinates or
 * `featured`, so those keep their blank defaults. Blank optional fields are
 * omitted from the PATCH payload, which leaves the stored values untouched.
 */
export function toPropertyFormValues(record) {
  return {
    ...propertyCreationInitialValues,
    titleEn: textValue(record.titleEn),
    titleAr: textValue(record.titleAr),
    titleDe: textValue(record.titleDe),
    transaction: optionValue(record.transaction),
    propertyType: optionValue(record.propertyType),
    status: optionValue(record.status),
    price: numberValue(record.price),
    currency: optionValue(record.currency),
    governorate: optionValue(record.governorate),
    city: textValue(record.city),
    district: textValue(record.district),
    neighborhood: textValue(record.neighborhood),
    address: textValue(record.address),
    bedrooms: numberValue(record.bedrooms),
    bathrooms: numberValue(record.bathrooms),
    area: numberValue(record.area),
    whatsapp: textValue(record.whatsapp),
  }
}

export function shouldWarnUnsavedChanges({
  dirty,
  submitting,
  succeeded,
}) {
  return dirty && !submitting && !succeeded
}

export function createSubmissionGate() {
  let pending = false
  return {
    finish() {
      pending = false
    },
    tryStart() {
      if (pending) return false
      pending = true
      return true
    },
  }
}

export function getPropertyCreationSuccessPath() {
  return '/dashboard'
}
