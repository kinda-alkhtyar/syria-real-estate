import officeService from '../services/office.service.js'
import {
  officeCreateSchema,
  officeIdSchema,
  officePropertiesQuerySchema,
  officeQuerySchema,
  officeUpdateSchema,
} from '../validation/office.schema.js'

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

export function createOfficeController({ service = officeService } = {}) {
  function parse(schema, value) {
    const result = schema.safeParse(value)
    if (!result.success) throw validationError(result)
    return result.data
  }

  return {
    async create(request, response) {
      const data = parse(officeCreateSchema, request.body)
      const office = await service.createOffice(data, request.auth.user)
      response.status(201).json({ data: office })
    },

    async update(request, response) {
      const { id } = parse(officeIdSchema, request.params)
      const data = parse(officeUpdateSchema, request.body)
      const office = await service.updateOffice(id, data, request.auth.user)
      response.status(200).json({ data: office })
    },

    // The office is gone, so the response carries only the id the caller sent,
    // in the same envelope every other office write uses.
    async remove(request, response) {
      const { id } = parse(officeIdSchema, request.params)
      const deleted = await service.deleteOffice(id, request.auth.user)
      response.status(200).json({ data: deleted })
    },

    async mine(request, response) {
      const office = await service.getMyOffice(request.auth.user)
      response.status(200).json({ data: office })
    },

    async list(request, response) {
      const criteria = parse(officeQuerySchema, request.query)
      response.status(200).json(await service.listOffices(criteria))
    },

    async detail(request, response) {
      const { id } = parse(officeIdSchema, request.params)
      const criteria = parse(officePropertiesQuerySchema, request.query)
      const office = await service.getOffice(id, criteria)

      if (!office) {
        const error = new Error('The requested office was not found.')
        error.code = 'OFFICE_NOT_FOUND'
        error.statusCode = 404
        throw error
      }

      response.status(200).json(office)
    },
  }
}

const officeController = createOfficeController()

export default officeController
