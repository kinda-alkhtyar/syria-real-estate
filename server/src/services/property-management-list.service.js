import { findManageableProperties } from '../repositories/property.repository.js'
import propertyMediaUrls from './property-media-url.service.js'

const sortOrders = {
  newest: [{ createdAt: 'desc' }, { id: 'asc' }],
  oldest: [{ createdAt: 'asc' }, { id: 'asc' }],
  'updated-newest': [{ updatedAt: 'desc' }, { id: 'asc' }],
  'updated-oldest': [{ updatedAt: 'asc' }, { id: 'asc' }],
  'price-asc': [{ price: 'asc' }, { id: 'asc' }],
  'price-desc': [{ price: 'desc' }, { id: 'asc' }],
}

function serializeDecimal(value) {
  return value === null ? null : value.toString()
}

function serializeManagementProperty(property, media) {
  return {
    id: property.id,
    slug: property.slug,
    titleEn: property.titleEn,
    titleAr: property.titleAr,
    titleDe: property.titleDe,
    titleTr: property.titleTr ?? null,
    // Exposed to the dashboard on purpose, like `whatsapp`: the edit form
    // pre-fills the description of the language being written.
    descriptionEn: property.descriptionEn ?? null,
    descriptionAr: property.descriptionAr ?? null,
    descriptionDe: property.descriptionDe ?? null,
    descriptionTr: property.descriptionTr ?? null,
    transaction: property.transaction,
    propertyType: property.propertyType,
    status: property.status,
    // Null unless the listing is REJECTED: the dashboard shows the moderator's
    // note next to the status so the owner knows what to change.
    rejectionReason: property.rejectionReason ?? null,
    governorate: property.governorate,
    city: property.city,
    district: property.district,
    neighborhood: property.neighborhood,
    address: property.address,
    price: serializeDecimal(property.price),
    currency: property.currency,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    area: serializeDecimal(property.area),
    whatsapp: property.whatsapp ?? null,
    videoUrl: media.videoUrl(property.status, property),
    videoMimeType: property.videoMimeType ?? null,
    // BigInt is not JSON-serializable; a video size always fits in a Number.
    videoSizeBytes:
      property.videoSizeBytes == null ? null : Number(property.videoSizeBytes),
    createdAt: property.createdAt,
    updatedAt: property.updatedAt,
    images: property.images.map((image) => ({
      id: image.id,
      // The dashboard is the one place unpublished listings are displayed, so
      // it is the one place their media has to be reachable without the
      // objects being world-readable.
      url: media.imageUrl(property.status, image),
      altEn: image.altEn,
      altAr: image.altAr,
      altDe: image.altDe,
      sortOrder: image.sortOrder,
      width: image.width,
      height: image.height,
    })),
  }
}

export function createPropertyManagementListService({
  mediaUrls = propertyMediaUrls,
  repository = { findManageableProperties },
} = {}) {
  return {
    async listManageableProperties(criteria, actor) {
      const {
        transactionType,
        propertyType,
        governorate,
        status,
        sort,
        page,
        pageSize,
      } = criteria
      const where = {
        ...(actor.role === 'OWNER' && { ownerId: actor.id }),
        ...(transactionType && { transaction: transactionType }),
        ...(propertyType && { propertyType }),
        ...(governorate && { governorate }),
        ...(status && { status }),
      }
      const { items, total } = await repository.findManageableProperties({
        where,
        orderBy: sortOrders[sort],
        skip: (page - 1) * pageSize,
        take: pageSize,
      })

      // One signing call per bucket for the whole page, however many listings
      // it holds; a published listing contributes nothing to sign.
      const media = await mediaUrls.forProperties(items)

      return {
        data: items.map((item) => serializeManagementProperty(item, media)),
        meta: {
          page,
          pageSize,
          total,
          totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
        },
      }
    },
  }
}

const propertyManagementListService =
  createPropertyManagementListService()

export default propertyManagementListService
