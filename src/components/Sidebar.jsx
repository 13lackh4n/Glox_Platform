import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import Avatar from './ui/Avatar'
import Badge from './ui/Badge'

function NavItem({ to, icon, label, badge, onClick }) {
  const { pathname } = useLocation()
  const active = pathname === to || (to !== '/' && pathname.startsWith(to))
  return (
    <Link
      to={to}
      onClick={onClick}
      className={[
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
        active
          ? 'bg-primary/15 text-primary'
          : 'text-text-secondary hover:bg-hover hover:text-text-main',
      ].join(' ')}
    >
      <span className="text-base">{icon}</span>
      <span className="flex-1">{label}</span>
      {badge != null && badge > 0 && (
        <Badge variant="warning">{badge}</Badge>
      )}
    </Link>
  )
}

function NavGroup({ label, children }) {
  return (
    <div className="mb-2">
      <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-text-secondary/60">
        {label}
      </p>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  )
}

export default function Sidebar({ open, onClose }) {
  const { user, profile, role } = useAuth()
  const [pendingCount, setPendingCount] = useState(0)
  const [lessonsCourseId, setLessonsCourseId] = useState(null)

  useEffect(() => {
    if (!user || role !== 'student') return
    supabase
      .from('enrollments')
      .select('course_id')
      .eq('user_id', user.id)
      .order('enrolled_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setLessonsCourseId(data?.course_id ?? null))
  }, [user, role])

  useEffect(() => {
    if (!user || role !== 'instructor') return
    async function fetchPending() {
      const { data: courses } = await supabase
        .from('courses')
        .select('id')
        .eq('instructor_id', user.id)
      const ids = (courses ?? []).map((c) => c.id)
      if (!ids.length) return
      const { count } = await supabase
        .from('enrollment_requests')
        .select('id', { count: 'exact', head: true })
        .in('course_id', ids)
        .eq('status', 'pending')
      setPendingCount(count ?? 0)
    }
    fetchPending()
  }, [user, role])

  const roleLabel = {
    student: 'Tələbə',
    instructor: 'Təlimçi',
    super_admin: 'Admin',
  }[role] ?? 'İstifadəçi'

  const roleBadgeVariant = {
    student: 'primary',
    instructor: 'secondary',
    super_admin: 'warning',
  }[role] ?? 'default'

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          'fixed left-0 top-0 z-50 flex h-full w-[260px] flex-col border-r border-border bg-card transition-transform duration-300',
          open ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0',
        ].join(' ')}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white text-sm font-bold">
            G
          </div>
          <span className="text-lg font-bold text-text-main">
            <span className="text-primary">Glox</span>{' '}
            <span className="text-secondary">Platform</span>
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {role === 'student' && (
            <>
              <NavGroup label="Əsas">
                <NavItem to="/dashboard" icon="🏠" label="Dashboard" onClick={onClose} />
                <NavItem to="/courses" icon="📚" label="Kurslarım" onClick={onClose} />
                {lessonsCourseId && (
                  <NavItem
                    to={`/lessons/${lessonsCourseId}`}
                    icon="📖"
                    label="Dərslər"
                    onClick={onClose}
                  />
                )}
              </NavGroup>
              <NavGroup label="Testlər">
                <NavItem to="/courses" icon="📝" label="Testlər" onClick={onClose} />
                <NavItem to="/profile" icon="🏆" label="Nəticələrim" onClick={onClose} />
              </NavGroup>
              <NavGroup label="İcma">
                <NavItem to="/courses" icon="💬" label="Forum" onClick={onClose} />
                <NavItem to="/courses" icon="🥇" label="Liderboard" onClick={onClose} />
              </NavGroup>
              <NavGroup label="Hesab">
                <NavItem to="/profile" icon="👤" label="Profil" onClick={onClose} />
              </NavGroup>
            </>
          )}

          {role === 'instructor' && (
            <NavGroup label="İdarəetmə">
              <NavItem to="/instructor" icon="📊" label="Panel" onClick={onClose} />
              <NavItem to="/instructor/groups" icon="👥" label="Qruplar" onClick={onClose} />
              <NavItem
                to="/instructor/requests"
                icon="📋"
                label="Müraciətlər"
                badge={pendingCount}
                onClick={onClose}
              />
              <NavItem to="/instructor/lessons" icon="📖" label="Dərslər" onClick={onClose} />
              <NavItem to="/instructor/tests" icon="📝" label="Testlər" onClick={onClose} />
              <NavItem to="/instructor/students" icon="👨‍🎓" label="Tələbələr" onClick={onClose} />
              <NavItem to="/instructor/results" icon="📈" label="Nəticələr" onClick={onClose} />
            </NavGroup>
          )}

          {role === 'super_admin' && (
            <>
              <NavGroup label="Platform">
                <NavItem to="/admin" icon="📊" label="Panel" onClick={onClose} />
                <NavItem to="/admin/courses" icon="🎓" label="Kurslar" onClick={onClose} />
                <NavItem to="/admin/users" icon="👥" label="İstifadəçilər" onClick={onClose} />
                <NavItem to="/admin/instructors" icon="👨‍🏫" label="Təlimçilər" onClick={onClose} />
                <NavItem to="/admin/stats" icon="📈" label="Statistika" onClick={onClose} />
              </NavGroup>
              <NavGroup label="Təlimçi">
                <NavItem to="/instructor" icon="🎯" label="Təlimçi Paneli" onClick={onClose} />
              </NavGroup>
            </>
          )}

          {!role && (
            <NavGroup label="Naviqasiya">
              <NavItem to="/" icon="🏠" label="Ana Səhifə" onClick={onClose} />
              <NavItem to="/courses" icon="📚" label="Kurslar" onClick={onClose} />
            </NavGroup>
          )}
        </nav>

        {/* User card */}
        {user && profile && (
          <div className="border-t border-border px-4 py-3">
            <div className="flex items-center gap-3">
              <Avatar name={profile.full_name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-main">
                  {profile.full_name ?? 'İstifadəçi'}
                </p>
                <Badge variant={roleBadgeVariant} className="mt-0.5">
                  {roleLabel}
                </Badge>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
