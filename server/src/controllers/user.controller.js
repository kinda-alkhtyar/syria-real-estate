import userService from '../services/user.service.js'
import {
  passwordChangeSchema,
  userProfileUpdateSchema,
} from '../validation/user.schema.js'

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

export function createUserController({ service = userService } = {}) {
  function parse(schema, value) {
    const result = schema.safeParse(value)
    if (!result.success) throw validationError(result)
    return result.data
  }

  return {
    async me(request, response) {
      const user = await service.getProfile(request.auth.user)
      response.status(200).json({ data: { user } })
    },

    async updateMe(request, response) {
      const data = parse(userProfileUpdateSchema, request.body)
      const user = await service.updateProfile(data, request.auth.user)
      response.status(200).json({ data: { user } })
    },

    async changePassword(request, response) {
      const data = parse(passwordChangeSchema, request.body)
      await service.changePassword(data, request.auth.user)
      // The session cookie is untouched, so the caller stays signed in; there
      // is nothing to return but the fact that it worked.
      response.status(204).end()
    },
  }
}

const userController = createUserController()

export default userController
