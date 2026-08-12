import {
  findUserPasswordCredential,
  findUserProfileById,
  updateUserCredential,
  updateUserProfile,
} from '../repositories/user.repository.js'
import { hashPassword, verifyPassword } from '../utils/password.js'

function userError(code, message, statusCode) {
  const error = new Error(message)
  error.code = code
  error.statusCode = statusCode
  return error
}

function notFoundError() {
  return userError('USER_NOT_FOUND', 'The account was not found.', 404)
}

export function serializeProfile(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone ?? null,
    whatsapp: user.whatsapp ?? null,
    role: user.role,
  }
}

export function createUserService({
  repository = {
    findUserPasswordCredential,
    findUserProfileById,
    updateUserCredential,
    updateUserProfile,
  },
  passwordUtility = { hashPassword, verifyPassword },
} = {}) {
  return {
    async getProfile(actor) {
      const user = await repository.findUserProfileById(actor.id)

      // A live session whose row has since disappeared is the only way here.
      if (!user) throw notFoundError()

      return serializeProfile(user)
    },

    /**
     * The identifier always comes from the session, never from the body, so a
     * caller can only ever edit their own profile whatever their role.
     */
    async updateProfile(data, actor) {
      try {
        return serializeProfile(await repository.updateUserProfile(actor.id, data))
      } catch (error) {
        if (error?.code === 'P2025') throw notFoundError()
        throw error
      }
    },

    /**
     * Changing a password leaves every session alone, including the one making
     * the request: the caller stays signed in and no cookie is reissued.
     */
    async changePassword({ current, new: newPassword }, actor) {
      const credential = await repository.findUserPasswordCredential(actor.id)

      if (!credential) throw notFoundError()

      // A Google-only account has no password to compare against, so there is
      // nothing this endpoint can verify. Answered distinctly from a wrong
      // password: the caller already proved who they are with a session.
      if (!credential.passwordHash) {
        throw userError(
          'PASSWORD_NOT_SET',
          'This account signs in with Google and has no password.',
          409,
        )
      }

      const matches = await passwordUtility.verifyPassword(
        credential.passwordHash,
        current,
      )

      if (!matches) {
        throw userError(
          'INVALID_CREDENTIALS',
          'The current password is incorrect.',
          401,
        )
      }

      await repository.updateUserCredential(actor.id, {
        passwordHash: await passwordUtility.hashPassword(newPassword),
      })
    },
  }
}

const userService = createUserService()

export const { changePassword, getProfile, updateProfile } = userService

export default userService
