import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'

import PropertyResultsErrorBoundary from './features/property-results/components/PropertyResultsErrorBoundary.jsx'
import PropertyResultsLoadingPage from './features/property-results/components/PropertyResultsLoadingPage.jsx'
import PropertyDetailsErrorBoundary from './features/properties/components/PropertyDetailsErrorBoundary.jsx'
import PropertyDetailsSkeleton from './features/properties/components/PropertyDetailsSkeleton.jsx'
import { useLocale } from './hooks/useLocale.js'
import { OwnerAdminRoute } from './features/auth/routing/ProtectedRoute.jsx'
import { AuthenticationLoadingState } from './features/auth/components/AuthRouteState.jsx'
import MainLayout from './layouts/MainLayout.jsx'
import HomePage from './pages/HomePage.jsx'
import FavoritesPage from './pages/FavoritesPage.jsx'

const PropertyResultsPage = lazy(
  () => import('./pages/PropertyResultsPage.jsx'),
)
const OfficesPage = lazy(() => import('./pages/OfficesPage.jsx'))
const AccountPage = lazy(() => import('./pages/AccountPage.jsx'))
const PropertyDetailsPage = lazy(
  () => import('./pages/PropertyDetailsPage.jsx'),
)
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'))
const DashboardLayout = lazy(() => import('./layouts/DashboardLayout.jsx'))
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'))
const PropertyCreationPage = lazy(
  () => import('./pages/PropertyCreationPage.jsx'),
)
const PropertyEditPage = lazy(() => import('./pages/PropertyEditPage.jsx'))
const PropertyImagesPage = lazy(() => import('./pages/PropertyImagesPage.jsx'))
const PropertyVideoPage = lazy(() => import('./pages/PropertyVideoPage.jsx'))

function PropertyDetailsFallback() {
  const { t } = useLocale()
  return <PropertyDetailsSkeleton label={t('propertyDetails.loading')} />
}

function App() {
  return (
    <Routes>
      <Route element={<OwnerAdminRoute />}>
        <Route
          element={
            <Suspense fallback={<AuthenticationLoadingState />}>
              <DashboardLayout />
            </Suspense>
          }
          path="dashboard"
        >
          <Route
            index
            element={
              <Suspense fallback={<AuthenticationLoadingState />}>
                <DashboardPage />
              </Suspense>
            }
          />
          <Route
            element={
              <Suspense fallback={<AuthenticationLoadingState />}>
                <PropertyCreationPage />
              </Suspense>
            }
            path="properties/new"
          />
          <Route
            element={
              <Suspense fallback={<AuthenticationLoadingState />}>
                <PropertyEditPage />
              </Suspense>
            }
            path="properties/:propertyId/edit"
          />
          <Route
            element={
              <Suspense fallback={<AuthenticationLoadingState />}>
                <PropertyImagesPage />
              </Suspense>
            }
            path="properties/:propertyId/images"
          />
          <Route
            element={
              <Suspense fallback={<AuthenticationLoadingState />}>
                <PropertyVideoPage />
              </Suspense>
            }
            path="properties/:propertyId/video"
          />
        </Route>
      </Route>
      <Route element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route element={<FavoritesPage />} path="favorites" />
        <Route
          element={
            <Suspense fallback={null}>
              <OfficesPage />
            </Suspense>
          }
          path="offices"
        />
        <Route
          element={
            <Suspense fallback={null}>
              <AccountPage />
            </Suspense>
          }
          path="account"
        />
        <Route
          element={
            <Suspense fallback={null}>
              <LoginPage />
            </Suspense>
          }
          path="login"
        />
        <Route
          element={
            <PropertyResultsErrorBoundary>
              <Suspense fallback={<PropertyResultsLoadingPage />}>
                <PropertyResultsPage />
              </Suspense>
            </PropertyResultsErrorBoundary>
          }
          path="properties"
        />
        <Route
          element={
            <PropertyDetailsErrorBoundary>
              <Suspense fallback={<PropertyDetailsFallback />}>
                <PropertyDetailsPage />
              </Suspense>
            </PropertyDetailsErrorBoundary>
          }
          path="properties/:propertyId"
        />
      </Route>
    </Routes>
  )
}

export default App
