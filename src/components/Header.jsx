import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { supabase } from '../lib/supabase'
import Avatar from './ui/Avatar'

export default function Header({ onMenuClick }) {
  const { user, profile } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [dropOpen, setDropOpen] = useState(false)
  const [search, setSearch] = useState('')

  async function handleSignOut() {
    setDropOpen(false)
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <header
      className="fixed top-0 z-30 flex h-16 w-full items-center gap-4 border-b border-border bg-card px-4"
      style={{ left: 0 }}
    >
      {/* Hamburger */}
      <button
        onClick={onMenuClick}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition hover:bg-hover hover:text-text-main lg:hidden"
        aria-label="Menyu"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Search */}
      <div className="relative hidden flex-1 max-w-md sm:block">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Axtar..."
          className="w-full rounded-lg border border-border bg-bg py-2 pl-9 pr-3 text-sm text-text-main placeholder-text-secondary outline-none transition focus:border-primary"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition hover:bg-hover hover:text-text-main"
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {/* Notifications */}
        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition hover:bg-hover hover:text-text-main">
          🔔
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger" />
        </button>

        {/* User dropdown */}
        {user ? (
          <div className="relative">
            <button
              onClick={() => setDropOpen((v) => !v)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-hover"
            >
              <Avatar name={profile?.full_name} size="sm" />
              <span className="hidden text-sm font-medium text-text-main sm:block">
                {profile?.full_name?.split(' ')[0] ?? 'İstifadəçi'}
              </span>
              <svg className="h-4 w-4 text-text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {dropOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDropOpen(false)} />
                <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-xl border border-border bg-card shadow-xl animate-scale-in">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-sm font-medium text-text-main truncate">
                      {profile?.full_name ?? user.email}
                    </p>
                    <p className="text-xs text-text-secondary truncate">{user.email}</p>
                  </div>
                  <div className="p-1">
                    <button
                      onClick={() => { setDropOpen(false); navigate('/profile') }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-secondary transition hover:bg-hover hover:text-text-main"
                    >
                      👤 Profil
                    </button>
                    <button
                      onClick={() => setDropOpen(false)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-secondary transition hover:bg-hover hover:text-text-main"
                    >
                      ⚙️ Ayarlar
                    </button>
                    <hr className="my-1 border-border" />
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger transition hover:bg-danger/10"
                    >
                      🚪 Çıxış
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/login')}
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-main transition hover:bg-hover"
            >
              Giriş
            </button>
            <button
              onClick={() => navigate('/register')}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition hover:opacity-90"
            >
              Qeydiyyat
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
