import { Outlet } from 'react-router-dom'

import Footer from '../components/layout/Footer.jsx'
import Header from '../components/layout/Header.jsx'

export default function MainLayout() {
  return (
    <div className="flex min-h-screen min-h-svh flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
