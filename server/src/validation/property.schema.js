import { z } from 'zod'

const transactionTypes = ['buy', 'rent', 'stay']
const propertyTypes = [
  'apartment',
  'house',
  'villa',
  'land',
  'commercial',
  'office',
]
const listingStatuses = [
  'draft',
  'pending_review',
  'available',
  'reserved',
  'sold',
  'rented',
  'rejected',
  'archived',
]
// Statuses a visitor is allowed to see. DRAFT, PENDING_REVIEW, REJECTED, and
// ARCHIVED are internal and must never reach the public list or detail
// responses.
const publicListingStatuses = ['available', 'reserved', 'sold', 'rented']

// Statuses an OWNER may write directly. AVAILABLE is absent on purpose: under
// moderation, publishing is an administrator decision taken through the approve
// endpoint, so an owner cannot self-publish by sending a status. PENDING_REVIEW
// and REJECTED are equally moderation-owned and are set by the server.
const ownerWritableStatuses = [
  'draft',
  'reserved',
  'sold',
  'rented',
  'archived',
]

// An administrator publishes directly, but PENDING_REVIEW and REJECTED stay out
// of the generic write: they are reached through submission and through the
// reject endpoint, which is what keeps a REJECTED listing always carrying a
// reason.
const administratorWritableStatuses = listingStatuses.filter(
  (status) => status !== 'pending_review' && status !== 'rejected',
)

export const publicPropertyStatuses = Object.freeze(
  publicListingStatuses.map((status) => status.toUpperCase()),
)

const currencies = ['usd', 'eur', 'syp']
export const governorates = [
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
]

export function enumValue(values) {
  return z
    .string()
    .transform((value) => value.trim().toLowerCase())
    .pipe(z.enum(values))
    .transform((value) => value.toUpperCase())
}

export function optionalEnum(values) {
  return enumValue(values).optional()
}

const priceSchema = z
  .string()
  .regex(/^\d+(?:\.\d{1,2})?$/, 'Must be a non-negative decimal.')
  .transform(Number)
  .pipe(z.number().finite().max(999999999999.99))
  .optional()

// Caps OFFSET at maximumPage * maximumPageSize rows so a crafted `page` value
// cannot force PostgreSQL to walk an unbounded result set. Deep access will be
// served by cursor pagination later.
const maximumPage = 200
const maximumPageSize = 100

function positiveIntegerSchema(maximum, defaultValue) {
  return z.preprocess(
    (value) => (value === undefined ? String(defaultValue) : value),
    z
      .string()
      .regex(/^[1-9]\d*$/, 'Must be a positive integer.')
      .transform(Number)
      .pipe(z.number().int().max(maximum)),
  )
}

// The pagination contract is identical on every paginated list, so the two
// fields are declared once and spread into each query schema.
export const paginationFields = Object.freeze({
  page: positiveIntegerSchema(maximumPage, 1),
  pageSize: positiveIntegerSchema(maximumPageSize, 20),
})

export const propertyQuerySchema = z
  .object({
    transactionType: optionalEnum(transactionTypes),
    propertyType: optionalEnum(propertyTypes),
    governorate: optionalEnum(governorates),
    status: optionalEnum(publicListingStatuses),
    minPrice: priceSchema,
    maxPrice: priceSchema,
    currency: optionalEnum(currencies),
    sort: z
      .enum(['newest', 'oldest', 'price-asc', 'price-desc'])
      .default('newest'),
    ...paginationFields,
  })
  .strict()
  .refine(
    ({ minPrice, maxPrice }) =>
      minPrice === undefined ||
      maxPrice === undefined ||
      minPrice <= maxPrice,
    {
      message: 'minPrice must be less than or equal to maxPrice.',
      path: ['minPrice'],
    },
  )

export const propertyManagementQuerySchema = z
  .object({
    transactionType: optionalEnum(transactionTypes),
    propertyType: optionalEnum(propertyTypes),
    governorate: optionalEnum(governorates),
    status: optionalEnum(listingStatuses),
    sort: z
      .enum([
        'newest',
        'oldest',
        'updated-newest',
        'updated-oldest',
        'price-asc',
        'price-desc',
      ])
      .default('updated-newest'),
    ...paginationFields,
  })
  .strict()

export const propertySlugSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug must contain lowercase letters, numbers, and hyphens only.',
    ),
})

// Free text is stored verbatim and echoed back in JSON, so angle brackets are
// refused at the edge rather than escaped later by every consumer in turn.
const htmlMessage = 'text cannot contain HTML tags'
const containsNoHtml = (value) => !value.includes('<') && !value.includes('>')

const plainText = (maximum) =>
  z.string().trim().min(1).max(maximum).refine(containsNoHtml, htmlMessage)

export const requiredText = (maximum) => plainText(maximum)
export const nullableText = (maximum) =>
  z.union([plainText(maximum), z.null()]).optional()

/**
 * True when the submitted value carries no more decimal places than the column
 * stores. A string is read literally; a number is round-tripped through the
 * scale rather than compared against a scaled product, because at the top of
 * the price range the product alone is not exact enough to judge.
 */
function withinDecimalPlaces(value, places) {
  const scale = 10 ** places
  if (typeof value === 'string') {
    const [, fraction = ''] = value.trim().split('.')
    return fraction.length <= places
  }
  return Math.round(value * scale) / scale === value
}

function decimalSchema({
  minimum,
  maximum,
  positive = false,
  decimalPlaces,
  label = 'value',
}) {
  const submitted = z.union([
    z.number().finite(),
    z
      .string()
      .trim()
      .regex(/^-?\d+(?:\.\d{1,6})?$/, 'Must be a valid decimal.'),
  ])

  // Postgres silently rounds anything finer than the column scale, so a value
  // the caller cannot store exactly is rejected instead of quietly changed.
  const scaled =
    decimalPlaces === undefined
      ? submitted
      : submitted.refine(
          (value) => withinDecimalPlaces(value, decimalPlaces),
          `${label} must have at most ${decimalPlaces} decimal places`,
        )

  return scaled
    .transform((value) => Number(value))
    .pipe(
      z
        .number()
        .finite()
        .min(minimum)
        .max(maximum)
        .refine((value) => !positive || value > 0, 'Must be greater than zero.'),
    )
}

// Sellers type their number in whatever convention their country uses, so the
// readable separators are accepted and then dropped: what is stored is
// canonical, `+<digits>` when a country code was given and bare digits
// otherwise. Consumers can therefore build a `wa.me` link from the digits
// without re-parsing. `null` clears a previously stored number.
const whatsappCharacters = /^\+?[\d\s()-]+$/
const minimumWhatsappDigits = 6
const maximumWhatsappDigits = 15

function whatsappDigits(value) {
  return value.replace(/\D/g, '')
}

export function normalizeWhatsappNumber(value) {
  const trimmed = value.trim()
  const digits = whatsappDigits(trimmed)
  return trimmed.startsWith('+') ? `+${digits}` : digits
}

// An office stores a landline alongside its WhatsApp number, and both are the
// same kind of value, so the rules are parameterised by the label they report.
export function contactNumberSchema(label) {
  return z
    .union([
      z
        .string()
        .trim()
        .regex(
          whatsappCharacters,
          `${label} may contain digits, spaces, dashes, parentheses, and a leading +.`,
        )
        .refine(
          (value) => whatsappDigits(value).length >= minimumWhatsappDigits,
          `${label} must contain at least ${minimumWhatsappDigits} digits.`,
        )
        .refine(
          (value) => whatsappDigits(value).length <= maximumWhatsappDigits,
          `${label} must contain at most ${maximumWhatsappDigits} digits.`,
        )
        .transform(normalizeWhatsappNumber),
      z.null(),
    ])
    .optional()
}

const whatsappSchema = contactNumberSchema('WhatsApp number')

// `slug` is absent by design: it is generated server-side on create and is
// never updatable. The schemas are strict, so a submitted slug is rejected
// rather than silently ignored.
const propertyFields = {
  titleEn: requiredText(200),
  titleAr: requiredText(200),
  titleDe: requiredText(200),
  descriptionEn: nullableText(20_000),
  descriptionAr: nullableText(20_000),
  descriptionDe: nullableText(20_000),
  transaction: enumValue(transactionTypes),
  propertyType: enumValue(propertyTypes),
  price: decimalSchema({
    minimum: 0,
    maximum: 999_999_999_999.99,
    decimalPlaces: 2,
    label: 'price',
  }),
  currency: enumValue(currencies),
  governorate: enumValue(governorates),
  city: requiredText(120),
  district: nullableText(120),
  neighborhood: nullableText(120),
  address: nullableText(500),
  bedrooms: z.number().int().min(0).max(100).nullable().optional(),
  bathrooms: z.number().int().min(0).max(100).nullable().optional(),
  area: decimalSchema({
    minimum: 0,
    maximum: 99_999_999.99,
    positive: true,
    decimalPlaces: 2,
    label: 'area',
  }),
  latitude: decimalSchema({ minimum: -90, maximum: 90 }).nullable().optional(),
  longitude: decimalSchema({ minimum: -180, maximum: 180 })
    .nullable()
    .optional(),
  whatsapp: whatsappSchema,
}

// `status` is absent from `propertyFields` on purpose. An owner does not choose
// the state a new listing starts in — every owner submission enters review — so
// the field belongs to the update variant only, and to the administrator
// schemas, where it is what keeps instant publishing available.
const ownerUpdateOnlyFields = {
  status: enumValue(ownerWritableStatuses).optional(),
}

// `featured` is editorial placement on the public homepage, so an OWNER must
// not be able to promote their own listing. Absent from the OWNER schemas,
// which are strict, an OWNER sending it is rejected rather than silently
// ignored.
const administratorOnlyFields = {
  featured: z.boolean().optional(),
  status: enumValue(administratorWritableStatuses).optional(),
}

function optionalVariant(fields) {
  return Object.fromEntries(
    Object.entries(fields).map(([name, schema]) => [name, schema.optional()]),
  )
}

const nonEmptyUpdate = [
  (value) => Object.keys(value).length > 0,
  { message: 'At least one property field is required.' },
]

export const propertyCreateSchema = z.object(propertyFields).strict()

export const administratorPropertyCreateSchema = z
  .object({ ...propertyFields, ...administratorOnlyFields })
  .strict()

export const propertyUpdateSchema = z
  .object({
    ...optionalVariant(propertyFields),
    ...ownerUpdateOnlyFields,
  })
  .strict()
  .refine(...nonEmptyUpdate)

export const administratorPropertyUpdateSchema = z
  .object({
    ...optionalVariant(propertyFields),
    ...administratorOnlyFields,
  })
  .strict()
  .refine(...nonEmptyUpdate)

export const propertyIdSchema = z
  .object({
    id: z.string().uuid(),
  })
  .strict()

// A rejection is only useful to the owner if it says why, so the reason is
// required rather than optional, and it is plain text like every other stored
// free-text field.
export const propertyRejectionSchema = z
  .object({
    reason: requiredText(500),
  })
  .strict()
