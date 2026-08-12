import {
  approveProperty,
  archiveProperty,
  createProperty,
  deleteProperty,
  getProperty,
  listProperties,
  rejectProperty,
  restoreProperty,
  updateProperty,
} from '../services/property.service.js'
import {
  administratorPropertyCreateSchema,
  administratorPropertyUpdateSchema,
  propertyCreateSchema,
  propertyIdSchema,
  propertyQuerySchema,
  propertyRejectionSchema,
  propertySlugSchema,
  propertyUpdateSchema,
} from '../validation/property.schema.js'

function validationError(result) {
  const error = new Error(
    result.error.issues
      .map((issue) => `${issue.path.join('.') || 'request'}: ${issue.message}`)
      .join('; '),
  )
  error.code = 'INVALID_REQUEST'
  error.statusCode = 400
  return error
}

export async function getProperties(request, response) {
  const result = propertyQuerySchema.safeParse(request.query)

  if (!result.success) {
    throw validationError(result)
  }

  response.status(200).json(await listProperties(result.data))
}

export async function getPropertyBySlug(request, response) {
  const result = propertySlugSchema.safeParse(request.params)

  if (!result.success) {
    throw validationError(result)
  }

  const property = await getProperty(result.data.slug)

  if (!property) {
    const error = new Error('The requested property was not found.')
    error.code = 'PROPERTY_NOT_FOUND'
    error.statusCode = 404
    throw error
  }

  response.status(200).json({
    data: property,
  })
}

export function createPropertyManagementController({
  service = {
    approveProperty,
    archiveProperty,
    createProperty,
    deleteProperty,
    rejectProperty,
    restoreProperty,
    updateProperty,
  },
} = {}) {
  function parse(schema, value) {
    const result = schema.safeParse(value)
    if (!result.success) throw validationError(result)
    return result.data
  }

  // Only an administrator may submit the editorial `featured` flag; the OWNER
  // schemas omit it and are strict, so an OWNER sending it gets a 400.
  function writeSchemaFor(actor, { administrator, owner }) {
    return actor.role === 'ADMIN' ? administrator : owner
  }

  return {
    async create(request, response) {
      const data = parse(
        writeSchemaFor(request.auth.user, {
          administrator: administratorPropertyCreateSchema,
          owner: propertyCreateSchema,
        }),
        request.body,
      )
      const property = await service.createProperty(data, request.auth.user)
      response.status(201).json({ data: property })
    },

    async update(request, response) {
      const { id } = parse(propertyIdSchema, request.params)
      const data = parse(
        writeSchemaFor(request.auth.user, {
          administrator: administratorPropertyUpdateSchema,
          owner: propertyUpdateSchema,
        }),
        request.body,
      )
      const property = await service.updateProperty(
        id,
        data,
        request.auth.user,
      )
      response.status(200).json({ data: property })
    },

    async archive(request, response) {
      const { id } = parse(propertyIdSchema, request.params)
      const property = await service.archiveProperty(id, request.auth.user)
      response.status(200).json({ data: property })
    },

    async restore(request, response) {
      const { id } = parse(propertyIdSchema, request.params)
      const property = await service.restoreProperty(id, request.auth.user)
      response.status(200).json({ data: property })
    },

    // The listing is gone, so there is nothing to serialize back beyond the id
    // the caller already holds; it is still returned in the usual envelope so
    // every management write reads the same way on the client.
    async remove(request, response) {
      const { id } = parse(propertyIdSchema, request.params)
      const deleted = await service.deleteProperty(id, request.auth.user)
      response.status(200).json({ data: deleted })
    },

    // Moderation is administrator-only; the route enforces the role, so these
    // two do not re-check it.
    async approve(request, response) {
      const { id } = parse(propertyIdSchema, request.params)
      const property = await service.approveProperty(id, request.auth.user)
      response.status(200).json({ data: property })
    },

    async reject(request, response) {
      const { id } = parse(propertyIdSchema, request.params)
      const { reason } = parse(propertyRejectionSchema, request.body)
      const property = await service.rejectProperty(
        id,
        reason,
        request.auth.user,
      )
      response.status(200).json({ data: property })
    },
  }
}

const managementController = createPropertyManagementController()

export const {
  approve: approvePropertyById,
  archive: archivePropertyById,
  create: createPropertyRecord,
  reject: rejectPropertyById,
  remove: deletePropertyById,
  restore: restorePropertyById,
  update: updatePropertyById,
} = managementController

export default managementController
