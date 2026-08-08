import { Navigate, useNavigate } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const ROLE_HOME = {
  student: '/dashboard',
  instructor: '/instructor',
  super_admin: '/admin',
}

export default function Pending() {
  const { user, role, isPending, loading, signOut } = useAuth()
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-text-secondary">
        Yüklənir...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!isPending) {
    return <Navigate to={ROLE_HOME[role] ?? '/'} replace />
  }

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-140px)] max-w-md flex-col items-center justify-center gap-6 px-4 py-12 text-center">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full"
        style={{ backgroundColor: 'var(--badge-warning-bg)' }}
      >
        <Clock size={28} strokeWidth={1.75} style={{ color: '#f59e0b' }} />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-text-main">Müraciətiniz göndərildi</h1>
        <p className="mt-3 text-text-secondary">
          Admin hesabınızı təsdiq edənə qədər platformaya giriş edə bilməzsiniz.
          Təsdiq haqqında email alacaqsınız.
        </p>
      </div>
      <button
        onClick={handleSignOut}
        className="rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-medium text-text-main transition hover:bg-hover"
      >
        Çıxış
      </button>
    </div>
  )
}
