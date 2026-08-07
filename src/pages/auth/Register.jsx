import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  function validate() {
    if (password.length < 6) {
      return 'Şifrə ən azı 6 simvoldan ibarət olmalıdır.'
    }
    if (password !== confirmPassword) {
      return 'Şifrələr uyğun gəlmir.'
    }
    return ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    const { data, error: signUpError } = await signUp(email, password, fullName)
    setLoading(false)

    if (signUpError) {
      setError('Qeydiyyat uğursuz oldu. Yenidən cəhd edin.')
      return
    }

    if (data?.session) {
      navigate('/dashboard')
      return
    }

    setInfo(
      'Qeydiyyat uğurlu oldu! E-poçtunuzu təsdiqlədikdən sonra giriş edə bilərsiniz.'
    )
    setTimeout(() => navigate('/login'), 2000)
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-140px)] max-w-md flex-col justify-center gap-6 px-4 py-12">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-text-main">Qeydiyyat</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Yeni hesab yaradın və kurslara başlayın
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-lg"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fullName" className="text-sm text-text-secondary">
            Ad Soyad
          </label>
          <input
            id="fullName"
            type="text"
            required
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="rounded-lg border border-border bg-bg px-3 py-2.5 text-text-main outline-none transition focus:border-primary"
            placeholder="Ad Soyad"
          />
        </div>

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
            className="rounded-lg border border-border bg-bg px-3 py-2.5 text-text-main outline-none transition focus:border-primary"
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
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-border bg-bg px-3 py-2.5 text-text-main outline-none transition focus:border-primary"
            placeholder="Ən azı 6 simvol"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirmPassword" className="text-sm text-text-secondary">
            Şifrə təkrar
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="rounded-lg border border-border bg-bg px-3 py-2.5 text-text-main outline-none transition focus:border-primary"
            placeholder="Şifrəni təkrar daxil edin"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        {info && (
          <div className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
            {info}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Göndərilir...' : 'Qeydiyyatdan keç'}
        </button>
      </form>

      <p className="text-center text-sm text-text-secondary">
        Artıq hesabınız var?{' '}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Giriş edin
        </Link>
      </p>
    </div>
  )
}
