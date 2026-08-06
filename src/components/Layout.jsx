import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-bg text-text-main">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-white/10 py-6 text-center text-sm text-text-secondary">
        © {new Date().getFullYear()} Glox Platform — Bütün hüquqlar qorunur.
      </footer>
    </div>
  )
}
