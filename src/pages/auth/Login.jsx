import { useEffect, useState } from 'react'
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

  useEffect(() => {
    if (localStorage.getItem('glox_deactivated')) {
      localStorage.removeItem('glox_deactivated')
      setError('Hesabınız deaktiv edilib. Ətraflı məlumat üçün admin ilə əlaqə saxlayın.')
    }
  }, [])

  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSending, setResetSending] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetError, setResetError] = useState('')

  async function handleResetSubmit(e) {
    e.preventDefault()
    setResetError('')
    if (!resetEmail) {
      setResetError('E-poçt daxil edin.')
      return
    }
    setResetSending(true)
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/login`,
    })
    setResetSending(false)
    if (resetErr) {
      setResetError('Göndərilmədi. Yenidən cəhd edin.')
      return
    }
    setResetSent(true)
  }

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
        .select('role, is_active, approval_status')
        .eq('id', userId)
        .single()

      if (profile?.is_active === false) {
        await supabase.auth.signOut()
        setLoading(false)
        setError('Hesabınız deaktiv edilib. Ətraflı məlumat üçün admin ilə əlaqə saxlayın.')
        return
      }

      if (profile?.approval_status === 'rejected') {
        await supabase.auth.signOut()
        setLoading(false)
        setError('Hesabınız rədd edilib. Ətraflı məlumat üçün admin ilə əlaqə saxlayın.')
        return
      }

      if (profile?.approval_status === 'pending') {
        setLoading(false)
        navigate('/pending')
        return
      }

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
        className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-lg"
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
            className="rounded-lg border border-border bg-input px-3 py-2.5 text-text-main outline-none transition focus:border-primary"
            placeholder="siz@nümunə.az"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm text-text-secondary">
              Şifrə
            </label>
            <button
              type="button"
              onClick={() => {
                setResetEmail(email)
                setResetError('')
                setResetSent(false)
                setShowReset(true)
              }}
              className="text-xs font-medium text-primary hover:underline"
            >
              Şifrəni unutdum?
            </button>
          </div>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-border bg-input px-3 py-2.5 text-text-main outline-none transition focus:border-primary"
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

      {showReset && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-bold text-text-main">Şifrəni sıfırla</h2>
            {resetSent ? (
              <>
                <p className="mt-3 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
                  Email göndərildi. Poçt qutunuzu yoxlayın.
                </p>
                <button
                  onClick={() => setShowReset(false)}
                  className="mt-5 w-full rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-main transition hover:bg-hover"
                >
                  Bağla
                </button>
              </>
            ) : (
              <form onSubmit={handleResetSubmit} className="mt-4 flex flex-col gap-4">
                <p className="text-sm text-text-secondary">
                  E-poçtunuzu daxil edin, şifrə sıfırlama linki göndərəcəyik.
                </p>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="siz@nümunə.az"
                  className="rounded-lg border border-border bg-input px-3 py-2.5 text-text-main outline-none transition focus:border-primary"
                />
                {resetError && (
                  <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                    {resetError}
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowReset(false)}
                    className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-main transition hover:bg-hover"
                  >
                    Ləğv et
                  </button>
                  <button
                    type="submit"
                    disabled={resetSending}
                    className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                  >
                    {resetSending ? 'Göndərilir...' : 'Göndər'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
