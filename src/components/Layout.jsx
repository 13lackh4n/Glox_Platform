import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ThemeProvider } from '../contexts/ThemeContext'
import Sidebar from './Sidebar'
import Header from './Header'

const AUTH_ROUTES = ['/login', '/register']

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuth()
  const { pathname } = useLocation()

  const isAuthPage = AUTH_ROUTES.includes(pathname)
  const isLanding = pathname === '/'
  const showSidebar = !isAuthPage && !isLanding && user

  return (
    <ThemeProvider userId={user?.id}>
      <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <Header onMenuClick={() => setSidebarOpen((v) => !v)} />

        <div className="flex pt-16">
          {showSidebar && (
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          )}

          <main
            className={[
              'flex-1 min-h-[calc(100vh-64px)] transition-all duration-300',
              showSidebar ? 'lg:ml-[260px]' : '',
            ].join(' ')}
          >
            <div className="mx-auto max-w-[1400px] p-6 animate-fade-in">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </ThemeProvider>
  )
}
