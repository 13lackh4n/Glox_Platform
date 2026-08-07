import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, Search, Bell, Sun, Moon, User, Settings, LogOut, ChevronDown } from 'lucide-react'
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
      className="fixed left-0 top-0 z-50 flex h-16 w-full items-center gap-4 border-b border-border bg-bg/80 px-4 backdrop-blur-md"
    >
      {/* Hamburger */}
      <button
        onClick={onMenuClick}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition hover:bg-hover hover:text-text-main lg:hidden"
        aria-label="Menyu"
      >
        <Menu size={19} strokeWidth={2} />
      </button>

      {/* Search */}
      <div className="relative hidden sm:block" style={{ width: 320 }}>
        <Search
          size={16}
          strokeWidth={2}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Axtar..."
          className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm text-text-main placeholder-text-muted outline-none transition focus:border-primary"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition hover:bg-hover hover:text-text-main"
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? <Sun size={18} strokeWidth={2} /> : <Moon size={18} strokeWidth={2} />}
        </button>

        {/* Notifications */}
        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition hover:bg-hover hover:text-text-main">
          <Bell size={18} strokeWidth={2} />
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
              <ChevronDown size={15} strokeWidth={2} className="text-text-muted" />
            </button>

            {dropOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDropOpen(false)} />
                <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-xl border border-border bg-card shadow-xl animate-scale-in">
                  <div className="border-b border-border px-4 py-3">
                    <p className="truncate text-sm font-medium text-text-main">
                      {profile?.full_name ?? user.email}
                    </p>
                    <p className="truncate text-xs text-text-muted">{user.email}</p>
                  </div>
                  <div className="p-1">
                    <button
                      onClick={() => { setDropOpen(false); navigate('/profile') }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-secondary transition hover:bg-hover hover:text-text-main"
                    >
                      <User size={16} strokeWidth={2} /> Profil
                    </button>
                    <button
                      onClick={() => setDropOpen(false)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-secondary transition hover:bg-hover hover:text-text-main"
                    >
                      <Settings size={16} strokeWidth={2} /> Ayarlar
                    </button>
                    <hr className="my-1 border-border" />
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger transition hover:bg-danger/10"
                    >
                      <LogOut size={16} strokeWidth={2} /> Çıxış
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
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition hover:bg-primary-hover"
            >
              Qeydiyyat
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
