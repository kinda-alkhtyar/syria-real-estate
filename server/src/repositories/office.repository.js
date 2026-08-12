import prisma from '../config/database.js'
import { publicPropertyStatuses } from '../validation/property.schema.js'

const publicOfficeSelect = {
  id: true,
  nameAr: true,
  nameEn: true,
  nameDe: true,
  descriptionAr: true,
  descriptionEn: true,
  descriptionDe: true,
  governorate: true,
  city: true,
  phone: true,
  whatsapp: true,
  logoUrl: true,
  createdAt: true,
  updatedAt: true,
}

// The count a visitor is shown must match what the office page will actually
// list, so drafts and archived listings are excluded from it. Counting every
// row would also disclose how much unpublished work an office is sitting on.
const publicPropertyCount = {
  _count: {
    select: {
      properties: { where: { status: { in: publicPropertyStatuses } } },
    },
  },
}

// Like the property list, the office list renders cards and displays no
// description, so the three Text columns stay out of a full page of results.
const publicOfficeListSelect = {
  ...Object.fromEntries(
    Object.entries(publicOfficeSelect).filter(
      ([field]) => !field.startsWith('description'),
    ),
  ),
  ...publicPropertyCount,
}

const publicOfficeDetailSelect = {
  ...publicOfficeSelect,
  ...publicPropertyCount,
}

export function createOfficeRepository(database = prisma) {
  return {
    /**
     * Creates the office and adopts every listing the owner already has.
     *
     * All three statements share one transaction: an office that exists while
     * its owner's listings still point nowhere would need a repair pass, and
     * the count is re-read afterwards so the response reflects the adoption.
     */
    createOffice(data) {
      return database.$transaction(async (transaction) => {
        const office = await transaction.office.create({
          data,
          select: { id: true },
        })
        // `officeId: null` keeps this a one-time link: a listing already moved
        // to another office is never taken over.
        await transaction.property.updateMany({
          where: { ownerId: data.ownerId, officeId: null },
          data: { officeId: office.id },
        })
        return transaction.office.findUnique({
          where: { id: office.id },
          select: publicOfficeDetailSelect,
        })
      })
    },

    findOfficeByOwnerId(ownerId) {
      return database.office.findUnique({
        where: { ownerId },
        select: publicOfficeDetailSelect,
      })
    },

    // Used by the property create path, so it reads the identifier alone.
    findOfficeIdByOwner(ownerId) {
      return database.office.findUnique({
        where: { ownerId },
        select: { id: true },
      })
    },

    findOfficeOwnership(id) {
      return database.office.findUnique({
        where: { id },
        select: { id: true, ownerId: true },
      })
    },

    findOfficeById(id) {
      return database.office.findUnique({
        where: { id },
        select: publicOfficeDetailSelect,
      })
    },

    updateOffice(id, data) {
      return database.office.update({
        where: { id },
        data,
        select: publicOfficeDetailSelect,
      })
    },

    // A hard delete, and a single statement: `Property.officeId` is declared
    // `onDelete: SetNull`, so the database unlinks the listings itself. Closing
    // an agency must never take its published listings down with it, which is
    // why nothing here touches the property table.
    deleteOffice(id) {
      return database.office.delete({ where: { id }, select: { id: true } })
    },

    async findOffices({ where, orderBy, skip, take }) {
      const [items, total] = await Promise.all([
        database.office.findMany({
          where,
          orderBy,
          skip,
          take,
          select: publicOfficeListSelect,
        }),
        database.office.count({ where }),
      ])

      return { items, total }
    },
  }
}

const officeRepository = createOfficeRepository()

export const {
  createOffice,
  deleteOffice,
  findOfficeById,
  findOfficeByOwnerId,
  findOfficeIdByOwner,
  findOfficeOwnership,
  findOffices,
  updateOffice,
} = officeRepository

export default officeRepository
