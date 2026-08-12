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
  // Unlike the public list, the dashboard list feeds the edit form: without the
  // stored descriptions the form cannot pre-fill them.
  descriptionEn: true,
  descriptionAr: true,
  descriptionDe: true,
  transaction: true,
  propertyType: true,
  status: true,
  // Only the dashboard sees why a submission was turned down; the public select
  // deliberately leaves it out.
  rejectionReason: true,
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

    // `status` travels with the ownership check because a write has to know
    // whether it is editing a rejected listing, which resubmits it for review.
    findPropertyOwnership(id) {
      return database.property.findUnique({
        where: { id },
        select: { id: true, ownerId: true, status: true },
      })
    },

    updateProperty(id, data) {
      return database.property.update({
        where: { id },
        data,
        select: publicPropertySelect,
      })
    },

    // A hard delete, at any status. The PropertyImage rows go with the listing
    // through the `onDelete: Cascade` on their propertyId foreign key, so they
    // are never deleted by hand here; every storage path the listing owned —
    // its images and its one video — is read inside the same transaction,
    // because once the rows are gone nothing else records which objects they
    // pointed at.
    deleteProperty(id) {
      return database.$transaction(async (transaction) => {
        const images = await transaction.propertyImage.findMany({
          where: { propertyId: id },
          select: { storagePath: true },
        })
        const { videoStoragePath } = await transaction.property.delete({
          where: { id },
          select: { videoStoragePath: true },
        })

        return {
          imageStoragePaths: images
            .map(({ storagePath }) => storagePath)
            .filter(Boolean),
          videoStoragePath,
        }
      })
    },

    // An approval or a rejection only ever reports the moderation outcome, so
    // it reads back the four fields the dashboard needs rather than a whole
    // listing, and it is the one write that returns `rejectionReason`.
    updatePropertyModeration(id, data) {
      return database.property.update({
        where: { id },
        data,
        select: {
          id: true,
          slug: true,
          status: true,
          rejectionReason: true,
        },
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
  deleteProperty,
  findPropertyOwnership,
  findPropertyVideo,
  updateProperty,
  updatePropertyModeration,
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
