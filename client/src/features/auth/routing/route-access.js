const loginPath = '/login'

export function getSafeReturnPath(locationState, fallback = '/') {
  const path = locationState?.from
  if (
    typeof path !== 'string' ||
    !path.startsWith('/') ||
    path.startsWith('//') ||
    path === loginPath ||
    path.startsWith(`${loginPath}?`) ||
    path.startsWith(`${loginPath}#`)
  ) {
    return fallback
  }
  return path
}

export function getRequestedPath(location) {
  return `${location.pathname}${location.search}${location.hash}`
}

export function resolveRouteAccess({
  allowedRoles,
  status,
  user,
}) {
  if (status === 'loading') return 'loading'
  if (status !== 'authenticated' || !user) return 'login'
  if (
    allowedRoles?.length > 0 &&
    !allowedRoles.includes(user.role)
  ) {
    return 'forbidden'
  }
  return 'allowed'
}
