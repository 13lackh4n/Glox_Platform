import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

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
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      setError('Giriş uğursuz oldu. E-poçt və ya şifrəni yoxlayın.')
      return
    }
    navigate('/dashboard')
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-bold text-text-main">Giriş et</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border border-white/10 bg-card p-6">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-text-secondary">E-poçt</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-white/10 bg-bg px-3 py-2 text-text-main outline-none focus:border-primary"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-text-secondary">Şifrə</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-white/10 bg-bg px-3 py-2 text-text-main outline-none focus:border-primary"
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-primary px-4 py-2 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Giriş edilir...' : 'Giriş et'}
        </button>
      </form>
      <p className="text-center text-sm text-text-secondary">
        Hesabınız yoxdur?{' '}
        <Link to="/register" className="text-primary hover:underline">
          Qeydiyyatdan keçin
        </Link>
      </p>
    </div>
  )
}
