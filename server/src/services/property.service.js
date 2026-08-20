import { randomUUID } from 'node:crypto'

import propertyImageStorage, {
  propertyVideoStorage,
} from '../adapters/property-image-storage.adapter.js'
import telegramNotifier from '../notifications/telegram-notifier.js'
import logger from '../observability/logger.js'
import { findOfficeIdByOwner } from '../repositories/office.repository.js'
import {
  createProperty as createPropertyRecord,
  deleteProperty as deletePropertyRecord,
  findProperties,
  findPropertyOwnership,
  findPropertyBySlug,
  updateProperty as updatePropertyRecord,
  updatePropertyModeration as updatePropertyModerationRecord,
} from '../repositories/property.repository.js'
import { publicPropertyStatuses } from '../validation/property.schema.js'
import listingTranslator from './listing-translation.service.js'

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

function serializeModeration(property) {
  return {
    id: property.id,
    slug: property.slug,
    status: property.status,
    rejectionReason: property.rejectionReason ?? null,
  }
}

export function createPropertyManagementService({
  repository = {
    createProperty: createPropertyRecord,
    deleteProperty: deletePropertyRecord,
    findOfficeIdByOwner,
    findPropertyOwnership,
    updateProperty: updatePropertyRecord,
    updatePropertyModeration: updatePropertyModerationRecord,
  },
  notifier = telegramNotifier,
  translator = listingTranslator,
  storage = propertyImageStorage,
  // Images and videos live in separate buckets, so each has its own adapter.
  videoStorage = propertyVideoStorage,
  log = logger,
} = {}) {
  /**
   * Fire and forget. A listing entering review is worth an alert but is not
   * worth a failed write, so the promise is dispatched and deliberately not
   * awaited, and neither a rejection nor a broken notifier reaches the caller.
   */
  function notifyPendingReview(property) {
    if (property?.status !== 'PENDING_REVIEW') return

    try {
      Promise.resolve(notifier?.notifyPendingReview?.(property)).catch(() => {})
    } catch {
      // A notifier that throws synchronously is still only a notifier.
    }
  }

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

    return property
  }

  async function updateAuthorizedProperty(id, data, actor) {
    const current = await authorizeProperty(id, actor)
    const resubmission = resubmissionFor(current, data, actor)
    try {
      const property = await repository.updateProperty(id, {
        ...data,
        ...resubmission,
      })
      // Only a resubmission alerts: an ordinary edit of a listing already in
      // review must not send the moderator the same listing twice.
      if (resubmission.status) notifyPendingReview(property)
      return serializeProperty(property)
    } catch (error) {
      translateWriteError(error)
    }
  }

  // Editing a rejected listing is how an owner answers the rejection, so the
  // edit is the resubmission: the listing re-enters review and the stale reason
  // is cleared. An administrator edits in place, and an owner who deliberately
  // sends a status (archiving it, say) is taken at their word.
  function resubmissionFor(current, data, actor) {
    const resubmitting =
      actor.role !== 'ADMIN' &&
      current.status === 'REJECTED' &&
      data.status === undefined

    return resubmitting
      ? { status: 'PENDING_REVIEW', rejectionReason: null }
      : {}
  }

  /**
   * Every object a deleted listing owned: its images, and the one video it may
   * have carried. Best effort by design, and each object is attempted on its
   * own — the rows are already committed as gone, so a failed removal has
   * nothing left to compensate, and one unreachable object must not stop the
   * rest from being cleaned up or turn the delete into a failure the caller
   * would retry against a listing that no longer exists.
   */
  async function removeStoredMedia({
    imageStoragePaths = [],
    videoStoragePath = null,
  }) {
    const objects = [
      ...imageStoragePaths.map((path) => ({
        adapter: storage,
        category: 'image',
        path,
      })),
      ...(videoStoragePath
        ? [{ adapter: videoStorage, category: 'video', path: videoStoragePath }]
        : []),
    ]

    for (const { adapter, category, path } of objects) {
      try {
        await adapter.remove(path)
      } catch (error) {
        log.error('property_media_cleanup_failed', {
          category,
          code: error?.code ?? 'STORAGE_OPERATION_FAILED',
          component: 'property-service',
        })
      }
    }
  }

  async function moderate(id, data) {
    // Reuses the ownership lookup purely as an existence check, so a missing
    // listing is a 404 here as it is on every other management write.
    await authorizeProperty(id, { role: 'ADMIN' })
    return serializeModeration(
      await repository.updatePropertyModeration(id, data),
    )
  }

  return {
    async createProperty(data, actor) {
      try {
        // An owner who runs an office publishes under it by default, so the
        // listing is attached at creation rather than left for a later pass.
        // Optional call: a caller-supplied repository need not know about
        // offices, and a listing without one is perfectly valid.
        const office = await repository.findOfficeIdByOwner?.(actor.id)

        // Listings are written in Arabic, so the English and German columns are
        // filled from it here rather than left as duplicated Arabic for every
        // EN/DE visitor. Optional call, and it resolves to `{}` on any failure:
        // a translation outage must never cost the owner their listing.
        const translations =
          (await translator?.translateListingFields?.(data)) ?? {}

        // The slug is never accepted from the caller. A UUID satisfies both the
        // public `/:slug` route pattern and the column's unique constraint
        // without leaking a guessable identifier for unpublished listings.
        const property = await repository.createProperty({
          ...data,
          ...translations,
          // An owner's listing enters review instead of going live; an
          // administrator writes the status they submitted, or the column
          // default, and so keeps publishing instantly.
          ...(actor.role !== 'ADMIN' && { status: 'PENDING_REVIEW' }),
          ownerId: actor.id,
          ...(office && { officeId: office.id }),
          slug: randomUUID(),
        })
        notifyPendingReview(property)
        return serializeProperty(property)
      } catch (error) {
        translateWriteError(error)
      }
    },

    updateProperty(id, data, actor) {
      return updateAuthorizedProperty(id, data, actor)
    },

    // Deleting is the owner's own decision at every status, published
    // included: unlike archiving, it is not a moderated state change, so
    // nothing here consults `status`.
    async deleteProperty(id, actor) {
      await authorizeProperty(id, actor)
      await removeStoredMedia((await repository.deleteProperty(id)) ?? {})
      return { id }
    },

    approveProperty(id) {
      return moderate(id, { status: 'AVAILABLE', rejectionReason: null })
    },

    rejectProperty(id, reason) {
      return moderate(id, { status: 'REJECTED', rejectionReason: reason })
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
  approveProperty,
  archiveProperty,
  createProperty,
  deleteProperty,
  rejectProperty,
  restoreProperty,
  updateProperty,
} = propertyManagementService

export default propertyManagementService
