import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import App from './App.jsx'
import { LocaleProvider } from './context/LocaleContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { FavoritesProvider } from './features/favorites/FavoritesProvider.jsx'
import { AuthProvider } from './features/auth/AuthProvider.jsx'
import { PropertiesProvider } from './features/properties/context/PropertiesProvider.jsx'
import './styles/globals.css'

// Registered only in a built app: the dev server rebuilds modules on every
// save, and a worker caching those responses would serve stale code back.
// Deliberately after `load` so it never competes with the first render.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // An unavailable worker only costs offline support, never the app.
    })
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <LocaleProvider>
          <AuthProvider>
            <PropertiesProvider>
              <FavoritesProvider>
                <App />
              </FavoritesProvider>
            </PropertiesProvider>
          </AuthProvider>
        </LocaleProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
