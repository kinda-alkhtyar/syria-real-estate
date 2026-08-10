import propertyManagementListService from '../services/property-management-list.service.js'
import { propertyManagementQuerySchema } from '../validation/property.schema.js'

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

export function createPropertyManagementListController({
  service = propertyManagementListService,
} = {}) {
  return {
    async list(request, response) {
      const result = propertyManagementQuerySchema.safeParse(request.query)
      if (!result.success) throw validationError(result)

      response.status(200).json(
        await service.listManageableProperties(
          result.data,
          request.auth.user,
        ),
      )
    },
  }
}

const propertyManagementListController =
  createPropertyManagementListController()

export default propertyManagementListController
