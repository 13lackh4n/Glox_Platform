import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, BookOpen, Users, GraduationCap, BarChart3, Briefcase,
  UsersRound, ClipboardList, BookMarked, FileText, UserCheck, Trophy,
  User, Medal, Home, Zap,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import Avatar from './ui/Avatar'
import Badge from './ui/Badge'

function NavItem({ to, icon: Icon, label, badge, onClick }) {
  const { pathname } = useLocation()
  const active = pathname === to || (to !== '/' && pathname.startsWith(to))
  return (
    <Link
      to={to}
      onClick={onClick}
      className={[
        'group flex items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm font-medium transition-all duration-150',
        active
          ? 'border-primary bg-hover text-text-main'
          : 'border-transparent text-text-secondary hover:bg-hover-subtle hover:text-text-main',
      ].join(' ')}
    >
      <Icon
        size={17}
        strokeWidth={2}
        className={active ? 'text-primary' : 'text-text-muted group-hover:text-text-secondary'}
      />
      <span className="flex-1">{label}</span>
      {badge != null && badge > 0 && <Badge variant="warning">{badge}</Badge>}
    </Link>
  )
}

function NavGroup({ label, children }) {
  return (
    <div className="mb-2">
      <p
        className="mb-1 px-3 text-text-secondary"
        style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}
      >
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
    student: 'success',
    instructor: 'secondary',
    super_admin: 'primary',
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
          'fixed left-0 top-0 z-40 flex h-full w-[260px] flex-col border-r border-border bg-bg-secondary transition-transform duration-300',
          open ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0',
        ].join(' ')}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
          >
            <Zap size={17} strokeWidth={2.5} fill="currentColor" />
          </div>
          <span className="text-lg font-bold text-text-main" style={{ letterSpacing: '-0.02em' }}>
            <span className="text-gradient">Glox</span>
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {role === 'student' && (
            <>
              <NavGroup label="Əsas">
                <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" onClick={onClose} />
                <NavItem to="/courses" icon={BookOpen} label="Kurslarım" onClick={onClose} />
                {lessonsCourseId && (
                  <NavItem
                    to={`/lessons/${lessonsCourseId}`}
                    icon={BookMarked}
                    label="Dərslər"
                    onClick={onClose}
                  />
                )}
              </NavGroup>
              <NavGroup label="Testlər">
                <NavItem to="/courses" icon={FileText} label="Testlər" onClick={onClose} />
                <NavItem to="/profile" icon={Trophy} label="Nəticələrim" onClick={onClose} />
              </NavGroup>
              <NavGroup label="İcma">
                <NavItem to="/leaderboard" icon={Medal} label="Liderboard" onClick={onClose} />
              </NavGroup>
              <NavGroup label="Hesab">
                <NavItem to="/profile" icon={User} label="Profil" onClick={onClose} />
              </NavGroup>
            </>
          )}

          {role === 'instructor' && (
            <NavGroup label="İdarəetmə">
              <NavItem to="/instructor" icon={LayoutDashboard} label="Panel" onClick={onClose} />
              <NavItem to="/instructor/groups" icon={UsersRound} label="Qruplar" onClick={onClose} />
              <NavItem
                to="/instructor/requests"
                icon={ClipboardList}
                label="Müraciətlər"
                badge={pendingCount}
                onClick={onClose}
              />
              <NavItem to="/instructor/lessons" icon={BookMarked} label="Dərslər" onClick={onClose} />
              <NavItem to="/instructor/tests" icon={FileText} label="Testlər" onClick={onClose} />
              <NavItem to="/instructor/students" icon={UserCheck} label="Tələbələr" onClick={onClose} />
              <NavItem to="/instructor/results" icon={Trophy} label="Nəticələr" onClick={onClose} />
            </NavGroup>
          )}

          {role === 'super_admin' && (
            <>
              <NavGroup label="Platform">
                <NavItem to="/admin" icon={LayoutDashboard} label="Panel" onClick={onClose} />
                <NavItem to="/admin/courses" icon={GraduationCap} label="Kurslar" onClick={onClose} />
                <NavItem to="/admin/users" icon={Users} label="İstifadəçilər" onClick={onClose} />
                <NavItem to="/admin/instructors" icon={GraduationCap} label="Təlimçilər" onClick={onClose} />
                <NavItem to="/admin/stats" icon={BarChart3} label="Statistika" onClick={onClose} />
              </NavGroup>
              <NavGroup label="Təlimçi">
                <NavItem to="/instructor" icon={Briefcase} label="Təlimçi Paneli" onClick={onClose} />
                <NavItem to="/instructor/groups" icon={UsersRound} label="Qruplar" onClick={onClose} />
                <NavItem to="/instructor/requests" icon={ClipboardList} label="Müraciətlər" onClick={onClose} />
                <NavItem to="/instructor/lessons" icon={BookMarked} label="Dərslər" onClick={onClose} />
                <NavItem to="/instructor/tests" icon={FileText} label="Testlər" onClick={onClose} />
                <NavItem to="/instructor/students" icon={UserCheck} label="Tələbələr" onClick={onClose} />
                <NavItem to="/instructor/results" icon={Trophy} label="Nəticələr" onClick={onClose} />
              </NavGroup>
            </>
          )}

          {!role && (
            <NavGroup label="Naviqasiya">
              <NavItem to="/" icon={Home} label="Ana Səhifə" onClick={onClose} />
              <NavItem to="/courses" icon={BookOpen} label="Kurslar" onClick={onClose} />
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
