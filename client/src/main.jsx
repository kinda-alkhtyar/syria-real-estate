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
