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
    'rif_aleppo',
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
  transactions: ['buy', 'rent', 'stay'],
})

// The three localized titles are absent by design: the form writes the title of
// the language being browsed, and the payload builder copies it into the other
// two so the server contract — which requires all three — stays satisfied.
const requiredTextFields = ['city', 'neighborhood']
const localeSuffixes = Object.freeze({ ar: 'Ar', de: 'De', en: 'En' })
const decimalFields = ['price', 'area']
const optionalDecimalFields = ['latitude', 'longitude']
const integerFields = ['bedrooms', 'bathrooms']
const knownFields = new Set(Object.keys(propertyCreationInitialValues))

// Mirrors the server rule: an optional leading `+` followed by digits and the
// readable separators every country writes its numbers with, and a digit count
// a real number can actually have. Kept optional — a blank field clears any
// stored number.
const whatsappPattern = /^\+?[\d\s()-]+$/

export function isValidWhatsappNumber(value) {
  const trimmed = value.trim()
  if (!whatsappPattern.test(trimmed)) return false
  const digits = trimmed.replace(/\D/g, '').length
  return digits >= 6 && digits <= 15
}

/**
 * True when something was typed without a country code. `wa.me` only resolves
 * numbers in international form, so the form nudges the owner — it never blocks
 * the submission, because the number may still be right for `tel:`.
 */
export function needsCountryCode(value) {
  const trimmed = value.trim()
  return trimmed !== '' && !trimmed.startsWith('+')
}

/**
 * The description field written in a given locale, e.g. `ar` → `descriptionAr`.
 * Returns an empty string for an unknown locale, which the callers read as
 * "no localized description to require".
 */
export function descriptionFieldForLocale(localeCode) {
  const suffix = localeSuffixes[localeCode]
  return suffix ? `description${suffix}` : ''
}

/** The title field written in a given locale, e.g. `ar` → `titleAr`. */
export function titleFieldForLocale(localeCode) {
  const suffix = localeSuffixes[localeCode]
  return suffix ? `title${suffix}` : ''
}

/**
 * The form only ever shows the title and description of the language being
 * browsed, so only those two are checked. The untouched descriptions stay blank
 * and are omitted from the payload exactly as any blank optional field is; the
 * untouched titles are filled in by `toPropertyCreationPayload`.
 *
 * `requireDescription` is false while editing: a blank description there means
 * "leave the stored text alone", so demanding one would force an owner fixing a
 * price to retype a description they never intended to change.
 */
export function validatePropertyCreation(
  values,
  { localeCode = '', requireDescription = true } = {},
) {
  const errors = {}
  for (const field of requiredTextFields) {
    if (!values[field]?.trim()) errors[field] = 'required'
  }
  const titleField = titleFieldForLocale(localeCode)
  if (titleField && !values[titleField]?.trim()) {
    errors[titleField] = 'required'
  }
  const descriptionField = descriptionFieldForLocale(localeCode)
  if (
    requireDescription &&
    descriptionField &&
    !values[descriptionField]?.trim()
  ) {
    errors[descriptionField] = 'required'
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

/**
 * The API requires a title in all three languages, but the form collects one.
 *
 * On create there is nothing else to send, so the written title is copied
 * across: a new listing is never rejected and never stored with a blank title,
 * and a viewer browsing an untranslated language reads the seller's own words
 * rather than nothing. On edit the two languages that are not being written
 * carry their stored values through untouched — copying there would silently
 * overwrite translations the owner never saw.
 */
function localizedTitles(values, { copyActiveTitle, localeCode }) {
  const stored = {
    titleEn: values.titleEn.trim(),
    titleAr: values.titleAr.trim(),
    titleDe: values.titleDe.trim(),
  }
  if (!copyActiveTitle) return stored
  const titleField = titleFieldForLocale(localeCode)
  const written = titleField ? stored[titleField] : ''
  return written
    ? { titleAr: written, titleDe: written, titleEn: written }
    : stored
}

export function toPropertyCreationPayload(
  values,
  {
    copyActiveTitle = false,
    includeFeatured = false,
    includeStatus = true,
    localeCode = '',
  } = {},
) {
  const payload = {
    ...localizedTitles(values, { copyActiveTitle, localeCode }),
    transaction: values.transaction,
    propertyType: values.propertyType,
    // Omitted when an owner creates a listing: submission is what sets the
    // status, and the OWNER create schema rejects the key outright rather than
    // ignoring it.
    ...(includeStatus && { status: values.status }),
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
  // `district` is no longer collected by the form, but it stays here: a legacy
  // listing that carries one sends it back unchanged, and a blank one is omitted
  // — never sent as `null`, which is what would erase the stored value.
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
 * The management endpoint does not return coordinates or `featured`, so those
 * keep their blank defaults. Blank optional fields are omitted from the PATCH
 * payload, which leaves the stored values untouched.
 */
export function toPropertyFormValues(record) {
  return {
    ...propertyCreationInitialValues,
    titleEn: textValue(record.titleEn),
    titleAr: textValue(record.titleAr),
    titleDe: textValue(record.titleDe),
    descriptionEn: textValue(record.descriptionEn),
    descriptionAr: textValue(record.descriptionAr),
    descriptionDe: textValue(record.descriptionDe),
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
