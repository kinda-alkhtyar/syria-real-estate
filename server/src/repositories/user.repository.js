import prisma from '../config/database.js'

const authenticationSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  passwordHash: true,
  isActive: true,
}

export function findUserForAuthentication(email) {
  return prisma.user.findUnique({
    where: { email },
    select: authenticationSelect,
  })
}

export function findUserByGoogleSub(googleSub) {
  return prisma.user.findUnique({
    where: { googleSub },
    select: authenticationSelect,
  })
}

/**
 * Attaches a Google identity to an account that already owns the address.
 * `provider` is left untouched so a password account keeps reporting how it was
 * created and stays able to sign in with its password.
 */
export function linkGoogleAccount(id, googleSub) {
  return prisma.user.update({
    where: { id },
    data: { googleSub },
    select: authenticationSelect,
  })
}

export function createGoogleUser({ email, googleSub, name, role }) {
  return prisma.user.create({
    data: {
      email,
      googleSub,
      name,
      provider: 'GOOGLE',
      role,
    },
    select: authenticationSelect,
  })
}

export function updateUserCredential(id, data) {
  return prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
    },
  })
}
