import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const ROLE_HOME = {
  student: '/dashboard',
  instructor: '/instructor',
  super_admin: '/admin',
}

function HeroIllustration() {
  return (
    <svg viewBox="0 0 480 360" className="w-full max-w-lg" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background card */}
      <rect x="40" y="40" width="400" height="280" rx="20" fill="var(--bg-card)" stroke="var(--border-color)" strokeWidth="1.5"/>
      {/* Header bar */}
      <rect x="40" y="40" width="400" height="56" rx="20" fill="var(--accent)" opacity="0.15"/>
      <circle cx="76" cy="68" r="10" fill="var(--accent)" opacity="0.7"/>
      <rect x="96" y="62" width="80" height="12" rx="6" fill="var(--text-secondary)" opacity="0.4"/>
      {/* Stat cards */}
      <rect x="60" y="116" width="100" height="64" rx="12" fill="var(--bg-primary)"/>
      <rect x="60" y="120" width="30" height="18" rx="6" fill="var(--accent)" opacity="0.5"/>
      <rect x="60" y="148" width="60" height="10" rx="5" fill="var(--text-secondary)" opacity="0.3"/>
      <rect x="60" y="162" width="40" height="8" rx="4" fill="var(--text-secondary)" opacity="0.2"/>

      <rect x="172" y="116" width="100" height="64" rx="12" fill="var(--bg-primary)"/>
      <rect x="172" y="120" width="30" height="18" rx="6" fill="var(--accent-2)" opacity="0.5"/>
      <rect x="172" y="148" width="60" height="10" rx="5" fill="var(--text-secondary)" opacity="0.3"/>
      <rect x="172" y="162" width="40" height="8" rx="4" fill="var(--text-secondary)" opacity="0.2"/>

      <rect x="284" y="116" width="100" height="64" rx="12" fill="var(--bg-primary)"/>
      <rect x="284" y="120" width="30" height="18" rx="6" fill="#22c55e" opacity="0.5"/>
      <rect x="284" y="148" width="60" height="10" rx="5" fill="var(--text-secondary)" opacity="0.3"/>
      <rect x="284" y="162" width="40" height="8" rx="4" fill="var(--text-secondary)" opacity="0.2"/>

      {/* Progress bars */}
      <rect x="60" y="196" width="324" height="10" rx="5" fill="var(--bg-primary)"/>
      <rect x="60" y="196" width="220" height="10" rx="5" fill="var(--accent)" opacity="0.7"/>
      <rect x="60" y="216" width="324" height="10" rx="5" fill="var(--bg-primary)"/>
      <rect x="60" y="216" width="160" height="10" rx="5" fill="var(--accent-2)" opacity="0.7"/>
      <rect x="60" y="236" width="324" height="10" rx="5" fill="var(--bg-primary)"/>
      <rect x="60" y="236" width="260" height="10" rx="5" fill="#22c55e" opacity="0.7"/>

      {/* Bottom buttons */}
      <rect x="60" y="264" width="100" height="36" rx="10" fill="var(--accent)"/>
      <rect x="172" y="264" width="100" height="36" rx="10" fill="var(--bg-primary)" stroke="var(--border-color)" strokeWidth="1.5"/>
    </svg>
  )
}

export default function Landing() {
  const { user, role, loading: authLoading } = useAuth()
  const [courses, setCourses] = useState([])
  const [stats, setStats] = useState({ courses: 0, students: 0, tests: 0, certs: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const [coursesRes, studentsRes, testsRes, resultsRes] = await Promise.all([
        supabase.from('courses').select('*').eq('is_active', true).order('created_at', { ascending: false }),
        supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('tests').select('id', { count: 'exact', head: true }),
        supabase.from('results').select('id', { count: 'exact', head: true }),
      ])
      setCourses(coursesRes.data ?? [])
      setStats({
        courses: coursesRes.data?.length ?? 0,
        students: studentsRes.count ?? 0,
        tests: testsRes.count ?? 0,
        certs: resultsRes.count ?? 0,
      })
      setLoading(false)
    }
    fetchData()
  }, [])

  if (!authLoading && user && role && ROLE_HOME[role]) {
    return <Navigate to={ROLE_HOME[role]} replace />
  }

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-16 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-text-secondary">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              TYE Elektronika Platforması
            </div>
            <h1 className="text-4xl font-bold text-text-main sm:text-5xl lg:text-6xl leading-tight">
              <span className="text-primary">Glox</span>{' '}
              <span className="text-secondary">Platform</span>
              <span className="block text-text-main mt-1">ilə öyrən</span>
            </h1>
            <p className="mt-4 max-w-xl text-lg text-text-secondary leading-relaxed">
              Elektronika sahəsində peşəkar bacarıqlar qazanmaq üçün interaktiv dərslər,
              testlər və sertifikatlar.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/register"
                className="rounded-xl bg-primary px-7 py-3.5 font-semibold text-white shadow-lg shadow-primary/25 transition hover:opacity-90 active:scale-95"
              >
                🚀 Qeydiyyat
              </Link>
              <Link
                to="/courses"
                className="rounded-xl border border-border bg-card px-7 py-3.5 font-semibold text-text-main transition hover:bg-hover active:scale-95"
              >
                📚 Kurslara bax
              </Link>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <HeroIllustration />
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-border bg-card py-8">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {[
              { icon: '🎓', value: stats.courses, label: 'Kurs' },
              { icon: '👥', value: stats.students, label: 'Tələbə' },
              { icon: '📝', value: stats.tests, label: 'Test' },
              { icon: '🏆', value: stats.certs, label: 'Nəticə' },
            ].map(({ icon, value, label }) => (
              <div key={label} className="text-center">
                <div className="text-3xl mb-1">{icon}</div>
                <div className="text-3xl font-bold text-text-main">{value}</div>
                <div className="text-sm text-text-secondary">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Courses */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold text-text-main">Kurslar</h2>
          <p className="mt-2 text-text-secondary">Elektronika sahəsinin bütün istiqamətləri</p>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded-xl border border-border bg-card" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <p className="text-center text-text-secondary">Hələ heç bir kurs əlavə edilməyib.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.slice(0, 6).map((course) => (
              <div
                key={course.id}
                className="group flex flex-col rounded-xl border border-border bg-card overflow-hidden transition-all duration-200 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-0.5"
              >
                {/* Card header gradient */}
                <div className="h-2 bg-gradient-to-r from-primary to-secondary" />
                <div className="flex flex-col gap-3 p-6 flex-1">
                  <h3 className="text-lg font-semibold text-text-main">{course.title}</h3>
                  <p className="text-sm text-text-secondary line-clamp-2 flex-1">
                    {course.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 rounded-full bg-secondary/10 px-2.5 py-1 text-xs font-medium text-secondary">
                      ⏱ {course.duration_months} ay
                    </span>
                    <span className="text-xs text-text-secondary">
                      {course.enrollment_type === 'open' ? '🔓 Açıq' : '🔒 Müraciət'}
                    </span>
                  </div>
                  <Link
                    to={`/courses/${course.id}`}
                    className="mt-2 rounded-lg bg-primary/10 px-4 py-2.5 text-center text-sm font-medium text-primary transition hover:bg-primary hover:text-white"
                  >
                    Ətraflı bax →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
        {courses.length > 6 && (
          <div className="mt-8 text-center">
            <Link
              to="/courses"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-medium text-text-main transition hover:bg-hover"
            >
              Bütün kursları gör →
            </Link>
          </div>
        )}
      </section>

      {/* How it works */}
      <section className="border-t border-border bg-card py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-text-main">Necə işləyir?</h2>
            <p className="mt-2 text-text-secondary">3 sadə addımda öyrənməyə başla</p>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              { step: '01', icon: '📝', title: 'Qeydiyyat', desc: 'Platformaya qeydiyyatdan keç, profil yarat.' },
              { step: '02', icon: '📚', title: 'Kurs seç', desc: 'Maraqlandığın kursa yazıl, dərsləri izlə.' },
              { step: '03', icon: '🏆', title: 'Sertifikat al', desc: 'Testləri tamamla, sertifikatını yüklə.' },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} className="relative flex flex-col items-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-3xl">
                  {icon}
                </div>
                <span className="absolute -top-2 -right-2 text-xs font-bold text-primary/40">{step}</span>
                <h3 className="text-lg font-semibold text-text-main">{title}</h3>
                <p className="mt-2 text-sm text-text-secondary">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-4 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <span className="text-lg font-bold text-text-main">
            <span className="text-primary">Glox</span>{' '}
            <span className="text-secondary">Platform</span>
          </span>
          <div className="flex gap-6 text-sm text-text-secondary">
            <Link to="/courses" className="transition hover:text-text-main">Kurslar</Link>
            <Link to="/login" className="transition hover:text-text-main">Giriş</Link>
            <Link to="/register" className="transition hover:text-text-main">Qeydiyyat</Link>
          </div>
          <p className="text-sm text-text-secondary">
            © {new Date().getFullYear()} Glox Platform
          </p>
        </div>
      </footer>
    </div>
  )
}
