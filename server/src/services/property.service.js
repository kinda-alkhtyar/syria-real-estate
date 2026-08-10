import { randomUUID } from 'node:crypto'

import {
  createProperty as createPropertyRecord,
  findProperties,
  findPropertyOwnership,
  findPropertyBySlug,
  updateProperty as updatePropertyRecord,
} from '../repositories/property.repository.js'
import { publicPropertyStatuses } from '../validation/property.schema.js'

const publicStatusSet = new Set(publicPropertyStatuses)

const sortOrders = {
  newest: [{ createdAt: 'desc' }, { slug: 'asc' }],
  oldest: [{ createdAt: 'asc' }, { slug: 'asc' }],
  'price-asc': [{ price: 'asc' }, { slug: 'asc' }],
  'price-desc': [{ price: 'desc' }, { slug: 'asc' }],
}

function serializeDecimal(value) {
  return value === null ? null : value.toString()
}

export function serializeProperty(property) {
  return {
    id: property.id,
    slug: property.slug,
    titleEn: property.titleEn,
    titleAr: property.titleAr,
    titleDe: property.titleDe,
    descriptionEn: property.descriptionEn,
    descriptionAr: property.descriptionAr,
    descriptionDe: property.descriptionDe,
    transaction: property.transaction,
    propertyType: property.propertyType,
    status: property.status,
    price: serializeDecimal(property.price),
    currency: property.currency,
    governorate: property.governorate,
    city: property.city,
    district: property.district,
    neighborhood: property.neighborhood,
    address: property.address,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    area: serializeDecimal(property.area),
    latitude: serializeDecimal(property.latitude),
    longitude: serializeDecimal(property.longitude),
    whatsapp: property.whatsapp ?? null,
    featured: property.featured,
    createdAt: property.createdAt,
    updatedAt: property.updatedAt,
    images: property.images,
  }
}

export async function listProperties(criteria) {
  const {
    transactionType,
    propertyType,
    governorate,
    status,
    minPrice,
    maxPrice,
    currency,
    sort,
    page,
    pageSize,
  } = criteria
  const where = {
    ...(transactionType && { transaction: transactionType }),
    ...(propertyType && { propertyType }),
    ...(governorate && { governorate }),
    // Enforced here as well as in the query schema: a public caller can narrow
    // the status but never widen it to DRAFT or ARCHIVED.
    status:
      status && publicStatusSet.has(status)
        ? status
        : { in: publicPropertyStatuses },
    ...(currency && { currency }),
    ...((minPrice !== undefined || maxPrice !== undefined) && {
      price: {
        ...(minPrice !== undefined && { gte: minPrice }),
        ...(maxPrice !== undefined && { lte: maxPrice }),
      },
    }),
  }
  const { items, total } = await findProperties({
    where,
    orderBy: sortOrders[sort],
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  return {
    data: items.map(serializeProperty),
    meta: {
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    },
  }
}

export async function getProperty(slug) {
  const property = await findPropertyBySlug(slug)

  // A non-public listing is reported as missing so the detail route cannot be
  // used to probe which slugs exist as drafts.
  return property && publicStatusSet.has(property.status)
    ? serializeProperty(property)
    : null
}

function propertyError(code, message, statusCode) {
  const error = new Error(message)
  error.code = code
  error.statusCode = statusCode
  return error
}

function translateWriteError(error) {
  if (error?.code === 'P2002') {
    throw propertyError(
      'PROPERTY_SLUG_CONFLICT',
      'A property with this slug already exists.',
      409,
    )
  }
  throw error
}

export function createPropertyManagementService({
  repository = {
    createProperty: createPropertyRecord,
    findPropertyOwnership,
    updateProperty: updatePropertyRecord,
  },
} = {}) {
  async function authorizeProperty(id, actor) {
    const property = await repository.findPropertyOwnership(id)

    if (!property) {
      throw propertyError(
        'PROPERTY_NOT_FOUND',
        'The requested property was not found.',
        404,
      )
    }

    if (actor.role !== 'ADMIN' && property.ownerId !== actor.id) {
      throw propertyError(
        'FORBIDDEN',
        'You are not allowed to manage this property.',
        403,
      )
    }
  }

  async function updateAuthorizedProperty(id, data, actor) {
    await authorizeProperty(id, actor)
    try {
      return serializeProperty(await repository.updateProperty(id, data))
    } catch (error) {
      translateWriteError(error)
    }
  }

  return {
    async createProperty(data, actor) {
      try {
        // The slug is never accepted from the caller. A UUID satisfies both the
        // public `/:slug` route pattern and the column's unique constraint
        // without leaking a guessable identifier for unpublished listings.
        const property = await repository.createProperty({
          ...data,
          ownerId: actor.id,
          slug: randomUUID(),
        })
        return serializeProperty(property)
      } catch (error) {
        translateWriteError(error)
      }
    },

    updateProperty(id, data, actor) {
      return updateAuthorizedProperty(id, data, actor)
    },

    archiveProperty(id, actor) {
      return updateAuthorizedProperty(id, { status: 'ARCHIVED' }, actor)
    },

    restoreProperty(id, actor) {
      return updateAuthorizedProperty(id, { status: 'DRAFT' }, actor)
    },
  }
}

const propertyManagementService = createPropertyManagementService()

export const {
  archiveProperty,
  createProperty,
  restoreProperty,
  updateProperty,
} = propertyManagementService

export default propertyManagementService
