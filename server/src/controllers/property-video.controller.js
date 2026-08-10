import { propertyVideoParamsSchema } from '../validation/property-video.schema.js'

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

export function createPropertyVideoController({ service }) {
  return {
    async authorizeProperty(request, _response, next) {
      try {
        const { propertyId } = parse(propertyVideoParamsSchema, {
          propertyId: request.params.propertyId,
        })
        await service.authorizeProperty(propertyId, request.auth.user)
        next()
      } catch (error) {
        next(error)
      }
    },

    async upload(request, response) {
      const { propertyId } = parse(propertyVideoParamsSchema, request.params)
      if (!request.file) {
        const error = new Error('Exactly one video is required.')
        error.code = 'VIDEO_REQUIRED'
        error.statusCode = 400
        throw error
      }
      const video = await service.uploadVideo(
        propertyId,
        request.file,
        request.auth.user,
      )
      response.status(201).json({ data: video })
    },

    async remove(request, response) {
      const { propertyId } = parse(propertyVideoParamsSchema, request.params)
      await service.deleteVideo(propertyId, request.auth.user)
      response.status(204).end()
    },
  }
}
