import { governorateLabel } from '../../../constants/governorate-keys.js'
import {
  toCallHref,
  toWhatsappHref,
} from '../../properties/utils/contact-links.js'

const localeSuffixes = { ar: 'Ar', de: 'De', en: 'En' }

// The three office names are all required, so the active locale always resolves
// and English is only a guard against an unknown locale code.
function localizedName(office, localeCode) {
  const suffix = localeSuffixes[localeCode] ?? localeSuffixes.en
  return office[`name${suffix}`] || office.nameEn || ''
}

// The description is optional per language: an office writes it once, in the
// language it works in. The active locale wins; failing that the first
// translation that carries text, in the same ar → en → de order the listings
// already use.
const translationFallbackOrder = ['ar', 'en', 'de']

function localizedDescription(office, localeCode) {
  for (const code of [localeCode, ...translationFallbackOrder]) {
    const suffix = localeSuffixes[code]
    if (!suffix) continue
    const value = office[`description${suffix}`]
    if (typeof value === 'string' && value.trim()) return value
  }
  return ''
}

/**
 * Up to two leading characters, used when an office has no logo. Built from the
 * localized name so an Arabic reader sees Arabic initials.
 */
export function officeInitials(name) {
  const words = String(name).trim().split(/\s+/).filter(Boolean)
  return words
    .slice(0, 2)
    .map((word) => [...word][0] ?? '')
    .join('')
    .toUpperCase()
}

function officeLocation(office, t) {
  return [governorateLabel(office.governorate, t), office.city]
    .filter(Boolean)
    .join(', ')
}

/**
 * Presentation model for one card in the office grid.
 *
 * @param {object} office
 * @param {string} localeCode
 * @param {(key: string, variables?: object) => string} t
 */
export function toOfficeCardModel(office, localeCode, t) {
  const name = localizedName(office, localeCode)

  return {
    id: office.id,
    href: `/offices/${office.id}`,
    initials: officeInitials(name),
    location: officeLocation(office, t),
    logoUrl: office.logoUrl ?? '',
    name,
    propertyCount: office._count?.properties ?? 0,
  }
}

/**
 * Presentation model for the office details header, adding the description and
 * the two contact targets.
 *
 * @param {object} office
 * @param {string} localeCode
 * @param {(key: string, variables?: object) => string} t
 */
export function toOfficeDetailsModel(office, localeCode, t) {
  return {
    ...toOfficeCardModel(office, localeCode, t),
    callHref: toCallHref(office.phone),
    description: localizedDescription(office, localeCode),
    whatsappHref: toWhatsappHref(
      office.whatsapp,
      t('offices.details.whatsappMessage'),
    ),
  }
}
