import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signUp(email, password, fullName)
    setLoading(false)
    if (error) {
      setError('Qeydiyyat uğursuz oldu. Yenidən cəhd edin.')
      return
    }
    setSuccess(true)
    setTimeout(() => navigate('/login'), 1500)
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-bold text-text-main">Qeydiyyat</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border border-white/10 bg-card p-6">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-text-secondary">Ad Soyad</label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="rounded-lg border border-white/10 bg-bg px-3 py-2 text-text-main outline-none focus:border-primary"
          />
        </div>
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
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-white/10 bg-bg px-3 py-2 text-text-main outline-none focus:border-primary"
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        {success && (
          <p className="text-sm text-success">
            Qeydiyyat uğurlu oldu! Giriş səhifəsinə yönləndirilirsiniz...
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-primary px-4 py-2 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Göndərilir...' : 'Qeydiyyatdan keç'}
        </button>
      </form>
      <p className="text-center text-sm text-text-secondary">
        Artıq hesabınız var?{' '}
        <Link to="/login" className="text-primary hover:underline">
          Giriş edin
        </Link>
      </p>
    </div>
  )
}
