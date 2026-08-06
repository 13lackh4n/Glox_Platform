import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const roleLinks = {
  student: [
    { to: '/dashboard', label: 'Panel' },
    { to: '/courses', label: 'Kurslar' },
    { to: '/profile', label: 'Profil' },
  ],
  instructor: [
    { to: '/instructor', label: 'Panel' },
    { to: '/instructor/courses', label: 'Kurslarım' },
    { to: '/instructor/tests', label: 'Testlər' },
    { to: '/instructor/students', label: 'Tələbələr' },
    { to: '/instructor/results', label: 'Nəticələr' },
  ],
  super_admin: [
    { to: '/admin', label: 'Panel' },
    { to: '/admin/courses', label: 'Kurslar' },
    { to: '/admin/users', label: 'İstifadəçilər' },
    { to: '/admin/instructors', label: 'Təlimçilər' },
    { to: '/admin/stats', label: 'Statistika' },
  ],
}

export default function Navbar() {
  const { user, profile, role, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const links = role ? roleLinks[role] ?? [] : []

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold text-text-main">
          <span className="text-primary">Glox</span>
          <span className="text-secondary">Platform</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm text-text-secondary transition hover:text-text-main"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <span className="text-sm text-text-secondary">
                {profile?.full_name ?? user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-text-main transition hover:bg-card"
              >
                Çıxış
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm text-text-secondary transition hover:text-text-main"
              >
                Giriş
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white transition hover:opacity-90"
              >
                Qeydiyyat
              </Link>
            </>
          )}
        </div>

        <button
          className="text-text-main md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menyu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-card px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-3">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className="text-sm text-text-secondary hover:text-text-main"
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <button
                onClick={handleSignOut}
                className="text-left text-sm text-danger"
              >
                Çıxış
              </button>
            ) : (
              <>
                <Link to="/login" onClick={() => setOpen(false)} className="text-sm text-text-secondary">
                  Giriş
                </Link>
                <Link to="/register" onClick={() => setOpen(false)} className="text-sm text-primary">
                  Qeydiyyat
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
