import prisma from '../config/database.js'

const imageSelect = {
  id: true,
  propertyId: true,
  url: true,
  storagePath: true,
  mimeType: true,
  sizeBytes: true,
  width: true,
  height: true,
  altEn: true,
  altAr: true,
  altDe: true,
  sortOrder: true,
  createdAt: true,
}

async function withSerializableRetry(database, operation) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await database.$transaction(operation, {
        isolationLevel: 'Serializable',
      })
    } catch (error) {
      if (error?.code !== 'P2034' || attempt === 2) throw error
    }
  }
}

async function applyOrder(transaction, propertyId, orderedIds, currentMaximum) {
  const temporaryStart = currentMaximum + orderedIds.length + 1
  for (const [index, id] of orderedIds.entries()) {
    await transaction.propertyImage.update({
      where: { id, propertyId },
      data: { sortOrder: temporaryStart + index },
    })
  }
  for (const [sortOrder, id] of orderedIds.entries()) {
    await transaction.propertyImage.update({
      where: { id, propertyId },
      data: { sortOrder },
    })
  }
}

export function createPropertyImageRepository(database = prisma) {
  return {
    countPropertyImages(propertyId) {
      return database.propertyImage.count({ where: { propertyId } })
    },

    findImage(propertyId, imageId) {
      return database.propertyImage.findFirst({
        where: { id: imageId, propertyId },
        select: imageSelect,
      })
    },

    listImages(propertyId) {
      return database.propertyImage.findMany({
        where: { propertyId },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        select: imageSelect,
      })
    },

    createWithinLimit(data, maximumImages) {
      return withSerializableRetry(database, async (transaction) => {
        const count = await transaction.propertyImage.count({
          where: { propertyId: data.propertyId },
        })
        if (count >= maximumImages) return { limitReached: true }

        const maximum = await transaction.propertyImage.aggregate({
          where: { propertyId: data.propertyId },
          _max: { sortOrder: true },
        })
        const image = await transaction.propertyImage.create({
          data: {
            ...data,
            sortOrder: (maximum._max.sortOrder ?? -1) + 1,
          },
          select: imageSelect,
        })
        return { image, limitReached: false }
      })
    },

    reorder(propertyId, orderedIds) {
      return withSerializableRetry(database, async (transaction) => {
        const images = await transaction.propertyImage.findMany({
          where: { propertyId },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          select: imageSelect,
        })
        const existingIds = new Set(images.map(({ id }) => id))
        if (
          images.length !== orderedIds.length ||
          orderedIds.some((id) => !existingIds.has(id))
        ) {
          return { invalidSet: true }
        }

        await applyOrder(
          transaction,
          propertyId,
          orderedIds,
          Math.max(-1, ...images.map(({ sortOrder }) => sortOrder)),
        )
        const byId = new Map(images.map((image) => [image.id, image]))
        return {
          invalidSet: false,
          images: orderedIds.map((id, sortOrder) => ({
            ...byId.get(id),
            sortOrder,
          })),
        }
      })
    },

    deleteAndCompact(propertyId, imageId) {
      return withSerializableRetry(database, async (transaction) => {
        const images = await transaction.propertyImage.findMany({
          where: { propertyId },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          select: imageSelect,
        })
        if (!images.some(({ id }) => id === imageId)) {
          return { deleted: false }
        }

        await transaction.propertyImage.delete({
          where: { id: imageId, propertyId },
        })
        const remaining = images.filter(({ id }) => id !== imageId)
        await applyOrder(
          transaction,
          propertyId,
          remaining.map(({ id }) => id),
          Math.max(-1, ...images.map(({ sortOrder }) => sortOrder)),
        )
        return { deleted: true }
      })
    },
  }
}

const propertyImageRepository = createPropertyImageRepository()

export default propertyImageRepository
