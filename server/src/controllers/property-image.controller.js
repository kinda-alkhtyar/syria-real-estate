import {
  propertyImageOrderSchema,
  propertyImageParamsSchema,
  propertyImagePropertyParamsSchema,
  propertyImageUploadBodySchema,
} from '../validation/property-image.schema.js'

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

function parse(schema, value) {
  const result = schema.safeParse(value)
  if (!result.success) throw validationError(result)
  return result.data
}

export function createPropertyImageController({ service }) {
  return {
    async authorizeProperty(request, _response, next) {
      try {
        const { propertyId } = parse(
          propertyImagePropertyParamsSchema,
          { propertyId: request.params.propertyId },
        )
        await service.authorizeProperty(propertyId, request.auth.user)
        next()
      } catch (error) {
        next(error)
      }
    },

    async upload(request, response) {
      const { propertyId } = parse(
        propertyImagePropertyParamsSchema,
        request.params,
      )
      const altText = parse(propertyImageUploadBodySchema, request.body)
      if (!request.file) {
        const error = new Error('Exactly one image is required.')
        error.code = 'IMAGE_REQUIRED'
        error.statusCode = 400
        throw error
      }
      const image = await service.uploadImage(
        propertyId,
        request.file,
        altText,
        request.auth.user,
      )
      response.status(201).json({ data: image })
    },

    async reorder(request, response) {
      const { propertyId } = parse(
        propertyImagePropertyParamsSchema,
        request.params,
      )
      const { imageIds } = parse(propertyImageOrderSchema, request.body)
      const images = await service.reorderImages(
        propertyId,
        imageIds,
        request.auth.user,
      )
      response.status(200).json({ data: images })
    },

    async setPrimary(request, response) {
      const { propertyId, imageId } = parse(
        propertyImageParamsSchema,
        request.params,
      )
      const images = await service.setPrimaryImage(
        propertyId,
        imageId,
        request.auth.user,
      )
      response.status(200).json({ data: images })
    },

    async remove(request, response) {
      const { propertyId, imageId } = parse(
        propertyImageParamsSchema,
        request.params,
      )
      await service.deleteImage(propertyId, imageId, request.auth.user)
      response.status(204).end()
    },
  }
}
