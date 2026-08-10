import prisma from '../config/database.js'

const publicPropertySelect = {
  id: true,
  slug: true,
  titleEn: true,
  titleAr: true,
  titleDe: true,
  descriptionEn: true,
  descriptionAr: true,
  descriptionDe: true,
  transaction: true,
  propertyType: true,
  status: true,
  price: true,
  currency: true,
  governorate: true,
  city: true,
  district: true,
  neighborhood: true,
  address: true,
  bedrooms: true,
  bathrooms: true,
  area: true,
  latitude: true,
  longitude: true,
  whatsapp: true,
  featured: true,
  createdAt: true,
  updatedAt: true,
  images: {
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      url: true,
      altEn: true,
      altAr: true,
      altDe: true,
      sortOrder: true,
    },
  },
}

// The list renders cards, and no list consumer reads a description: the only
// place one is displayed is the detail page, which is served by
// findPropertyBySlug. Leaving three Text columns out here keeps a full page
// from carrying text nobody displays.
const publicListSelect = Object.fromEntries(
  Object.entries(publicPropertySelect).filter(
    ([field]) => !field.startsWith('description'),
  ),
)

const managementPropertySelect = {
  id: true,
  slug: true,
  titleEn: true,
  titleAr: true,
  titleDe: true,
  transaction: true,
  propertyType: true,
  status: true,
  price: true,
  currency: true,
  governorate: true,
  city: true,
  district: true,
  neighborhood: true,
  address: true,
  bedrooms: true,
  bathrooms: true,
  area: true,
  whatsapp: true,
  videoUrl: true,
  videoMimeType: true,
  videoSizeBytes: true,
  createdAt: true,
  updatedAt: true,
  images: {
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      url: true,
      altEn: true,
      altAr: true,
      altDe: true,
      sortOrder: true,
      width: true,
      height: true,
    },
  },
}

const propertyVideoSelect = {
  id: true,
  videoUrl: true,
  videoStoragePath: true,
  videoMimeType: true,
  videoSizeBytes: true,
}

export function createPropertyRepository(database = prisma) {
  return {
    createProperty(data) {
      return database.property.create({
        data,
        select: publicPropertySelect,
      })
    },

    findPropertyOwnership(id) {
      return database.property.findUnique({
        where: { id },
        select: { id: true, ownerId: true },
      })
    },

    updateProperty(id, data) {
      return database.property.update({
        where: { id },
        data,
        select: publicPropertySelect,
      })
    },

    findPropertyVideo(id) {
      return database.property.findUnique({
        where: { id },
        select: propertyVideoSelect,
      })
    },

    // Conditional writes keep "one video per property" atomic without a
    // transaction: concurrent uploads race on videoStoragePath being null.
    async attachPropertyVideo(id, video) {
      const result = await database.property.updateMany({
        where: { id, videoStoragePath: null },
        data: video,
      })
      return result.count
    },

    async clearPropertyVideo(id) {
      const result = await database.property.updateMany({
        where: { id, videoStoragePath: { not: null } },
        data: {
          videoUrl: null,
          videoStoragePath: null,
          videoMimeType: null,
          videoSizeBytes: null,
        },
      })
      return result.count
    },
  }
}

const managementRepository = createPropertyRepository()

export const {
  attachPropertyVideo,
  clearPropertyVideo,
  createProperty,
  findPropertyOwnership,
  findPropertyVideo,
  updateProperty,
} = managementRepository

export async function findProperties({ where, orderBy, skip, take }) {
  const [items, total] = await Promise.all([
    prisma.property.findMany({
      where,
      orderBy,
      skip,
      take,
      select: publicListSelect,
    }),
    prisma.property.count({ where }),
  ])

  return { items, total }
}

export function findPropertyBySlug(slug) {
  return prisma.property.findUnique({
    where: { slug },
    select: publicPropertySelect,
  })
}

export async function findManageableProperties({
  where,
  orderBy,
  skip,
  take,
}) {
  const [items, total] = await Promise.all([
    prisma.property.findMany({
      where,
      orderBy,
      skip,
      take,
      select: managementPropertySelect,
    }),
    prisma.property.count({ where }),
  ])

  return { items, total }
}
