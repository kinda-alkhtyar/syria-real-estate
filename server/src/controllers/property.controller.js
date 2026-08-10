import {
  archiveProperty,
  createProperty,
  getProperty,
  listProperties,
  restoreProperty,
  updateProperty,
} from '../services/property.service.js'
import {
  administratorPropertyCreateSchema,
  administratorPropertyUpdateSchema,
  propertyCreateSchema,
  propertyIdSchema,
  propertyQuerySchema,
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
    archiveProperty,
    createProperty,
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
  }
}

const managementController = createPropertyManagementController()

export const {
  archive: archivePropertyById,
  create: createPropertyRecord,
  restore: restorePropertyById,
  update: updatePropertyById,
} = managementController
