import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const ThemeContext = createContext(null)

export function ThemeProvider({ children, userId }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('glox_theme') || 'dark'
  })

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  function applyTheme(t) {
    if (t === 'light') {
      document.documentElement.classList.add('light')
    } else {
      document.documentElement.classList.remove('light')
    }
  }

  async function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('glox_theme', next)
    if (userId) {
      await supabase.from('users').update({ theme: next }).eq('id', userId)
    }
  }

  async function loadThemeFromDB(uid) {
    const { data } = await supabase.from('users').select('theme').eq('id', uid).single()
    if (data?.theme) {
      setTheme(data.theme)
      localStorage.setItem('glox_theme', data.theme)
      applyTheme(data.theme)
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, loadThemeFromDB }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider')
  return ctx
}
