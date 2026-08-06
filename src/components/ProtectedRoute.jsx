import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const ROLE_HOME = {
  student: '/dashboard',
  instructor: '/instructor',
  super_admin: '/admin',
}

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, role, loading } = useAuth()

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

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Redirect to the role's own home instead of a hardcoded route —
    // otherwise a role mismatch on a student-only page (e.g. /dashboard)
    // bounces a non-student straight back into the same guard.
    const home = ROLE_HOME[role] ?? '/'
    return <Navigate to={home} replace />
  }

  return children
}
