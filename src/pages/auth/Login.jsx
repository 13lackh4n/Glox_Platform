import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

const roleRedirects = {
  student: '/dashboard',
  instructor: '/instructor',
  super_admin: '/admin',
}

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: signInError } = await signIn(email, password)

    if (signInError) {
      setLoading(false)
      setError('Giriş uğursuz oldu. E-poçt və ya şifrəni yoxlayın.')
      return
    }

    const userId = data?.user?.id
    let role = 'student'

    if (userId) {
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()
      role = profile?.role ?? 'student'
    }

    setLoading(false)
    navigate(roleRedirects[role] ?? '/dashboard')
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-140px)] max-w-md flex-col justify-center gap-6 px-4 py-12">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-text-main">Giriş et</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Hesabınıza daxil olun və öyrənməyə davam edin
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-xl border border-white/10 bg-card p-6 shadow-lg"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm text-text-secondary">
            E-poçt
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-white/10 bg-bg px-3 py-2.5 text-text-main outline-none transition focus:border-primary"
            placeholder="siz@nümunə.az"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm text-text-secondary">
            Şifrə
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-white/10 bg-bg px-3 py-2.5 text-text-main outline-none transition focus:border-primary"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Giriş edilir...' : 'Giriş et'}
        </button>
      </form>

      <p className="text-center text-sm text-text-secondary">
        Hesabınız yoxdur?{' '}
        <Link to="/register" className="font-medium text-primary hover:underline">
          Qeydiyyatdan keçin
        </Link>
      </p>
    </div>
  )
}
