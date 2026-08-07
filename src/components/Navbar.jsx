import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function Navbar() {
  const { user, profile, role, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [lessonsCourseId, setLessonsCourseId] = useState(null)
  const [pendingRequestCount, setPendingRequestCount] = useState(0)

  useEffect(() => {
    if (!user || role !== 'student') {
      setLessonsCourseId(null)
      return
    }
    async function fetchEnrolledCourse() {
      const { data } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('user_id', user.id)
        .order('enrolled_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      setLessonsCourseId(data?.course_id ?? null)
    }
    fetchEnrolledCourse()
  }, [user, role])

  useEffect(() => {
    if (!user || role !== 'instructor') {
      setPendingRequestCount(0)
      return
    }
    async function fetchPendingCount() {
      const { data: courses } = await supabase
        .from('courses')
        .select('id')
        .eq('instructor_id', user.id)
      const courseIds = (courses ?? []).map((c) => c.id)
      if (courseIds.length === 0) {
        setPendingRequestCount(0)
        return
      }
      const { count } = await supabase
        .from('enrollment_requests')
        .select('id', { count: 'exact', head: true })
        .in('course_id', courseIds)
        .eq('status', 'pending')
      setPendingRequestCount(count ?? 0)
    }
    fetchPendingCount()
  }, [user, role])

  const links = (() => {
    if (role === 'student') {
      const studentLinks = [
        { to: '/dashboard', label: 'Panel' },
        { to: '/courses', label: 'Kurslar' },
      ]
      if (lessonsCourseId) {
        studentLinks.push({ to: `/lessons/${lessonsCourseId}`, label: 'Dərslər' })
      }
      studentLinks.push({ to: '/profile', label: 'Profil' })
      return studentLinks
    }
    if (role === 'instructor') {
      return [
        { to: '/instructor', label: 'Panel' },
        { to: '/instructor/courses', label: 'Kurslarım' },
        { to: '/instructor/groups', label: 'Qruplar' },
        { to: '/instructor/requests', label: 'Müraciətlər', badge: pendingRequestCount },
        { to: '/instructor/lessons', label: 'Dərslər' },
        { to: '/instructor/tests', label: 'Testlər' },
        { to: '/instructor/students', label: 'Tələbələr' },
        { to: '/instructor/results', label: 'Nəticələr' },
      ]
    }
    if (role === 'super_admin') {
      return [
        { to: '/admin', label: 'Panel' },
        { to: '/admin/courses', label: 'Kurslar' },
        { to: '/admin/users', label: 'İstifadəçilər' },
        { to: '/admin/instructors', label: 'Təlimçilər' },
        { to: '/admin/stats', label: 'Statistika' },
      ]
    }
    return []
  })()

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold text-text-main">
          <span className="text-primary">Glox</span>
          <span className="text-secondary">Platform</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="flex items-center gap-1.5 text-sm text-text-secondary transition hover:text-text-main"
            >
              {link.label}
              {!!link.badge && (
                <span className="rounded-full bg-warning px-1.5 py-0.5 text-xs font-bold text-bg">
                  {link.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <span className="text-sm text-text-secondary">
                {profile?.full_name ?? user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-text-main transition hover:bg-card"
              >
                Çıxış
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm text-text-secondary transition hover:text-text-main"
              >
                Giriş
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white transition hover:opacity-90"
              >
                Qeydiyyat
              </Link>
            </>
          )}
        </div>

        <button
          className="text-text-main md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menyu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-card px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-3">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-main"
              >
                {link.label}
                {!!link.badge && (
                  <span className="rounded-full bg-warning px-1.5 py-0.5 text-xs font-bold text-bg">
                    {link.badge}
                  </span>
                )}
              </Link>
            ))}
            {user ? (
              <button
                onClick={handleSignOut}
                className="text-left text-sm text-danger"
              >
                Çıxış
              </button>
            ) : (
              <>
                <Link to="/login" onClick={() => setOpen(false)} className="text-sm text-text-secondary">
                  Giriş
                </Link>
                <Link to="/register" onClick={() => setOpen(false)} className="text-sm text-primary">
                  Qeydiyyat
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
