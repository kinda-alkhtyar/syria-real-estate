import { syrianGovernorates } from '../../../constants/syrian-governorates.js'

// The shared governorate list, keyed the way the API spells its enum. Aleppo
// Countryside is included because it comes from that one list.
export const officeGovernorates = syrianGovernorates.map(
  ({ id, labelKey }) => ({ labelKey, value: id.replaceAll('-', '_') }),
)

export const officeFormInitialValues = Object.freeze({
  city: '',
  description: '',
  governorate: 'damascus',
  name: '',
  phone: '',
  whatsapp: '',
})

export const officeFieldLimits = Object.freeze({
  city: 120,
  description: 5000,
  name: 160,
  phone: 32,
  whatsapp: 32,
})

const localeSuffixes = Object.freeze({ ar: 'Ar', de: 'De', en: 'En' })

// Mirrors the server rule for both contact numbers: an optional leading `+`,
// then digits and the readable separators, with a digit count a real number
// can have.
const contactPattern = /^\+?[\d\s()-]+$/

export function isValidContactNumber(value) {
  const trimmed = value.trim()
  if (!contactPattern.test(trimmed)) return false
  const digits = trimmed.replace(/\D/g, '').length
  return digits >= 6 && digits <= 15
}

const containsHtml = (value) => value.includes('<') || value.includes('>')

/**
 * @returns {Record<string, string>} Message keys, keyed by field name.
 */
export function validateOfficeForm(values) {
  const errors = {}

  const name = values.name.trim()
  if (!name) errors.name = 'officeForm.errors.nameRequired'
  else if (name.length > officeFieldLimits.name) {
    errors.name = 'officeForm.errors.nameTooLong'
  } else if (containsHtml(name)) errors.name = 'officeForm.errors.noHtml'

  const description = values.description.trim()
  if (description.length > officeFieldLimits.description) {
    errors.description = 'officeForm.errors.descriptionTooLong'
  } else if (description && containsHtml(description)) {
    errors.description = 'officeForm.errors.noHtml'
  }

  const city = values.city.trim()
  if (city.length > officeFieldLimits.city) {
    errors.city = 'officeForm.errors.cityTooLong'
  } else if (city && containsHtml(city)) errors.city = 'officeForm.errors.noHtml'

  for (const field of ['phone', 'whatsapp']) {
    const value = values[field].trim()
    if (value && !isValidContactNumber(value)) {
      errors[field] = 'officeForm.errors.contactNumber'
    }
  }

  return errors
}

/**
 * Builds the request body from the single-language form.
 *
 * On create the one name that was typed is copied into all three columns, the
 * same arrangement the listing form uses for titles: the API requires three
 * names, and the owner should only have to write one. While editing, only the
 * active locale's name and description are sent, so fixing a phone number
 * never overwrites a translation someone else wrote.
 *
 * Empty optional fields are sent as `null` while editing — that is how the API
 * clears a stored value — and omitted entirely on create.
 */
export function toOfficePayload(values, { localeCode, mode }) {
  const suffix = localeSuffixes[localeCode] ?? localeSuffixes.en
  const creating = mode === 'create'
  const name = values.name.trim()
  const description = values.description.trim()
  const city = values.city.trim()
  const phone = values.phone.trim()
  const whatsapp = values.whatsapp.trim()

  const names = creating
    ? { nameAr: name, nameDe: name, nameEn: name }
    : { [`name${suffix}`]: name }

  const optional = (value) =>
    value ? value : creating ? undefined : null

  return {
    ...names,
    ...(description || !creating
      ? { [`description${suffix}`]: optional(description) }
      : {}),
    governorate: values.governorate,
    ...(city || !creating ? { city: optional(city) } : {}),
    ...(phone || !creating ? { phone: optional(phone) } : {}),
    ...(whatsapp || !creating ? { whatsapp: optional(whatsapp) } : {}),
  }
}

/**
 * Fills the form from a stored office, reading the active locale's name and
 * description so the owner edits the language being browsed.
 */
export function toOfficeFormValues(office, localeCode) {
  const suffix = localeSuffixes[localeCode] ?? localeSuffixes.en

  return {
    city: office.city ?? '',
    description: office[`description${suffix}`] ?? '',
    governorate: String(office.governorate ?? 'DAMASCUS').toLowerCase(),
    name: office[`name${suffix}`] ?? office.nameEn ?? '',
    phone: office.phone ?? '',
    whatsapp: office.whatsapp ?? '',
  }
}
