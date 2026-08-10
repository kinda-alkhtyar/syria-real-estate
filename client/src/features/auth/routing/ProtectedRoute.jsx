import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth.js'
import {
  AuthenticationLoadingState,
  ForbiddenState,
} from '../components/AuthRouteState.jsx'
import {
  getRequestedPath,
  resolveRouteAccess,
} from './route-access.js'

export function RoleProtectedRoute({ allowedRoles, children }) {
  const { status, user } = useAuth()
  const location = useLocation()
  const access = resolveRouteAccess({ allowedRoles, status, user })

  if (access === 'loading') {
    return <AuthenticationLoadingState />
  }
  if (access === 'login') {
    return (
      <Navigate
        replace
        state={{ from: getRequestedPath(location) }}
        to="/login"
      />
    )
  }
  if (access === 'forbidden') {
    return <ForbiddenState />
  }

  return children ?? <Outlet />
}

export function AuthenticatedRoute(props) {
  return <RoleProtectedRoute {...props} />
}

export function OwnerAdminRoute(props) {
  return (
    <RoleProtectedRoute
      {...props}
      allowedRoles={['OWNER', 'ADMIN']}
    />
  )
}
