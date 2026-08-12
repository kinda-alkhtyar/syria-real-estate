import {
  createOffice as createOfficeRecord,
  deleteOffice as deleteOfficeRecord,
  findOfficeById,
  findOfficeByOwnerId,
  findOfficeOwnership,
  findOffices,
  updateOffice as updateOfficeRecord,
} from '../repositories/office.repository.js'
import { findProperties } from '../repositories/property.repository.js'
import { publicPropertyStatuses } from '../validation/property.schema.js'
import { serializeProperty } from './property.service.js'

// The list is always newest first, as specified; `id` only breaks a tie so the
// order stays stable across pages when two offices share a timestamp.
const officeSortOrder = [{ createdAt: 'desc' }, { id: 'asc' }]
const officePropertySortOrder = [{ createdAt: 'desc' }, { slug: 'asc' }]

function paginationMeta({ page, pageSize, total }) {
  return {
    page,
    pageSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  }
}

/**
 * One serializer for both the list and the detail response. The list select
 * omits the three description columns, so those keys come back undefined and
 * drop out of the JSON — the same arrangement `serializeProperty` relies on.
 */
export function serializeOffice(office) {
  return {
    id: office.id,
    nameAr: office.nameAr,
    nameEn: office.nameEn,
    nameDe: office.nameDe,
    descriptionAr: office.descriptionAr,
    descriptionEn: office.descriptionEn,
    descriptionDe: office.descriptionDe,
    governorate: office.governorate,
    city: office.city ?? null,
    phone: office.phone ?? null,
    whatsapp: office.whatsapp ?? null,
    logoUrl: office.logoUrl ?? null,
    createdAt: office.createdAt,
    updatedAt: office.updatedAt,
    _count: { properties: office._count?.properties ?? 0 },
  }
}

function officeError(code, message, statusCode) {
  const error = new Error(message)
  error.code = code
  error.statusCode = statusCode
  return error
}

export function createOfficeService({
  repository = {
    createOffice: createOfficeRecord,
    deleteOffice: deleteOfficeRecord,
    findOfficeById,
    findOfficeByOwnerId,
    findOfficeOwnership,
    findOffices,
    updateOffice: updateOfficeRecord,
  },
  propertyRepository = { findProperties },
} = {}) {
  async function authorizeOffice(id, actor) {
    const office = await repository.findOfficeOwnership(id)

    if (!office) {
      throw officeError(
        'OFFICE_NOT_FOUND',
        'The requested office was not found.',
        404,
      )
    }

    if (actor.role !== 'ADMIN' && office.ownerId !== actor.id) {
      throw officeError(
        'FORBIDDEN',
        'You are not allowed to manage this office.',
        403,
      )
    }
  }

  return {
    async createOffice(data, actor) {
      try {
        // The owner comes from the session, never from the body, and the unique
        // constraint on `ownerId` — not a preceding read — is what makes "one
        // office per owner" hold under concurrent requests.
        const office = await repository.createOffice({
          ...data,
          ownerId: actor.id,
        })
        return serializeOffice(office)
      } catch (error) {
        if (error?.code === 'P2002') {
          throw officeError(
            'OFFICE_ALREADY_EXISTS',
            'This account already has an office.',
            409,
          )
        }
        throw error
      }
    },

    /**
     * The signed-in owner's own office. Answers 404 rather than null so the
     * dashboard can treat "no office yet" as a plain, expected outcome.
     */
    async getMyOffice(actor) {
      const office = await repository.findOfficeByOwnerId(actor.id)

      if (!office) {
        throw officeError(
          'OFFICE_NOT_FOUND',
          'You have not created an office yet.',
          404,
        )
      }

      return serializeOffice(office)
    },

    async updateOffice(id, data, actor) {
      await authorizeOffice(id, actor)
      return serializeOffice(await repository.updateOffice(id, data))
    },

    /**
     * Closing an office, not closing a business: the owner's listings survive
     * the delete with their `officeId` set to null by the database, so they
     * stay published and simply stop being attributed to an agency.
     */
    async deleteOffice(id, actor) {
      await authorizeOffice(id, actor)
      await repository.deleteOffice(id)
      return { id }
    },

    async listOffices({ governorate, page, pageSize }) {
      const where = { ...(governorate && { governorate }) }
      const { items, total } = await repository.findOffices({
        where,
        orderBy: officeSortOrder,
        skip: (page - 1) * pageSize,
        take: pageSize,
      })

      return {
        data: items.map(serializeOffice),
        meta: paginationMeta({ page, pageSize, total }),
      }
    },

    /**
     * Returns null when no such office exists so the controller can raise the
     * one shared 404, and only then pages through its listings.
     */
    async getOffice(id, { page, pageSize }) {
      const office = await repository.findOfficeById(id)
      if (!office) return null

      const { items, total } = await propertyRepository.findProperties({
        where: {
          officeId: id,
          // Only published listings, matching what `_count.properties` reports.
          status: { in: publicPropertyStatuses },
        },
        orderBy: officePropertySortOrder,
        skip: (page - 1) * pageSize,
        take: pageSize,
      })

      return {
        data: serializeOffice(office),
        properties: {
          data: items.map(serializeProperty),
          meta: paginationMeta({ page, pageSize, total }),
        },
      }
    },
  }
}

const officeService = createOfficeService()

export const {
  createOffice,
  deleteOffice,
  getMyOffice,
  getOffice,
  listOffices,
  updateOffice,
} = officeService

export default officeService
