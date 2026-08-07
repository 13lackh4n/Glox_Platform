import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { UserPlus, BookOpen, Award, Clock, LockOpen, Lock, ArrowRight } from 'lucide-react'
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
      <defs>
        <linearGradient id="heroGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--accent-2)" />
        </linearGradient>
      </defs>
      {/* Background card */}
      <rect x="40" y="40" width="400" height="280" rx="20" fill="var(--bg-card)" stroke="var(--border-color)" strokeWidth="1.5"/>
      {/* Header bar */}
      <rect x="40" y="40" width="400" height="56" rx="20" fill="url(#heroGrad)" opacity="0.15"/>
      <circle cx="76" cy="68" r="10" fill="url(#heroGrad)" opacity="0.8"/>
      <rect x="96" y="62" width="80" height="12" rx="6" fill="var(--text-secondary)" opacity="0.4"/>
      {/* Stat cards */}
      <rect x="60" y="116" width="100" height="64" rx="12" fill="var(--bg-primary)"/>
      <rect x="60" y="120" width="30" height="18" rx="6" fill="url(#heroGrad)" opacity="0.6"/>
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
      <rect x="60" y="196" width="220" height="10" rx="5" fill="url(#heroGrad)" opacity="0.8"/>
      <rect x="60" y="216" width="324" height="10" rx="5" fill="var(--bg-primary)"/>
      <rect x="60" y="216" width="160" height="10" rx="5" fill="var(--accent-2)" opacity="0.7"/>
      <rect x="60" y="236" width="324" height="10" rx="5" fill="var(--bg-primary)"/>
      <rect x="60" y="236" width="260" height="10" rx="5" fill="#22c55e" opacity="0.7"/>

      {/* Bottom buttons */}
      <rect x="60" y="264" width="100" height="36" rx="10" fill="url(#heroGrad)"/>
      <rect x="172" y="264" width="100" height="36" rx="10" fill="var(--bg-primary)" stroke="var(--border-color)" strokeWidth="1.5"/>
    </svg>
  )
}

const HOW_IT_WORKS = [
  { step: '01', icon: UserPlus, title: 'Qeydiyyat', desc: 'Platformaya qeydiyyatdan keç, profil yarat.' },
  { step: '02', icon: BookOpen, title: 'Kurs seç', desc: 'Maraqlandığın kursa yazıl, dərsləri izlə.' },
  { step: '03', icon: Award, title: 'Sertifikat al', desc: 'Testləri tamamla, sertifikatını yüklə.' },
]

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
      <section
        className="relative flex items-center overflow-hidden"
        style={{ minHeight: '100vh' }}
      >
        <div
          className="absolute inset-0 bg-grid-pattern"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% -10%, color-mix(in oklab, var(--accent) 15%, transparent), transparent)',
          }}
        />
        <div className="absolute inset-0 bg-grid-pattern" />

        <div className="relative mx-auto max-w-6xl px-4 py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-text-secondary">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                TYE Elektronika Platforması
              </div>
              <h1
                className="font-extrabold leading-[1.05] text-text-main"
                style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, letterSpacing: '-0.03em' }}
              >
                <span className="text-gradient">Glox</span> Platform
                <span className="block">ilə öyrən</span>
              </h1>
              <p className="mt-5 text-text-muted" style={{ fontSize: '1.125rem', maxWidth: 480, lineHeight: 1.6 }}>
                Elektronika sahəsində peşəkar bacarıqlar qazanmaq üçün interaktiv dərslər,
                testlər və sertifikatlar.
              </p>
              <div className="mt-9 flex flex-wrap gap-4">
                <Link
                  to="/register"
                  className="flex items-center gap-2 rounded-xl px-7 py-3.5 font-semibold text-white shadow-lg transition active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                    boxShadow: '0 8px 24px color-mix(in oklab, var(--accent) 35%, transparent)',
                  }}
                >
                  Qeydiyyat <ArrowRight size={18} strokeWidth={2} />
                </Link>
                <Link
                  to="/courses"
                  className="rounded-xl border border-border px-7 py-3.5 font-semibold text-text-main backdrop-blur-md transition hover:bg-hover active:scale-[0.98]"
                  style={{ background: 'color-mix(in oklab, var(--bg-card) 60%, transparent)' }}
                >
                  Kurslara bax
                </Link>
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <HeroIllustration />
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-border bg-bg-secondary py-10">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-2 divide-border lg:grid-cols-4 lg:divide-x">
            {[
              { value: stats.courses, label: 'Kurs' },
              { value: stats.students, label: 'Tələbə' },
              { value: stats.tests, label: 'Test' },
              { value: stats.certs, label: 'Nəticə' },
            ].map(({ value, label }) => (
              <div key={label} className="px-4 text-center">
                <div className="text-gradient text-4xl font-extrabold" style={{ letterSpacing: '-0.02em' }}>
                  {value}
                </div>
                <div className="mt-1 text-sm text-text-muted">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Courses */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold text-text-main" style={{ letterSpacing: '-0.02em' }}>Kurslar</h2>
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
            {courses.slice(0, 6).map((course, idx) => {
              const isCyan = idx % 2 === 1
              return (
                <div
                  key={course.id}
                  className="card-surface flex flex-col overflow-hidden transition-all duration-200 hover:-translate-y-1"
                  style={{ padding: 0 }}
                >
                  <div
                    style={{
                      height: 4,
                      background: isCyan
                        ? 'linear-gradient(90deg, var(--accent-2), #0e7490)'
                        : 'linear-gradient(90deg, var(--accent), var(--accent-hover))',
                    }}
                  />
                  <div className="flex flex-1 flex-col gap-3 p-6">
                    <h3 className="text-lg font-semibold text-text-main">{course.title}</h3>
                    <p className="flex-1 text-sm text-text-secondary line-clamp-2">
                      {course.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 rounded-full bg-secondary/10 px-2.5 py-1 text-xs font-medium text-secondary">
                        <Clock size={12} strokeWidth={2} /> {course.duration_months} ay
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-text-secondary">
                        {course.enrollment_type === 'open' ? (
                          <><LockOpen size={12} strokeWidth={2} /> Açıq</>
                        ) : (
                          <><Lock size={12} strokeWidth={2} /> Müraciət</>
                        )}
                      </span>
                    </div>
                    <Link
                      to={`/courses/${course.id}`}
                      className="mt-2 flex items-center justify-center gap-1.5 rounded-lg bg-primary/10 px-4 py-2.5 text-center text-sm font-medium text-primary transition hover:bg-primary hover:text-white"
                    >
                      Ətraflı bax <ArrowRight size={14} strokeWidth={2} />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {courses.length > 6 && (
          <div className="mt-8 text-center">
            <Link
              to="/courses"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-medium text-text-main transition hover:bg-hover"
            >
              Bütün kursları gör <ArrowRight size={16} strokeWidth={2} />
            </Link>
          </div>
        )}
      </section>

      {/* How it works */}
      <section className="border-t border-border bg-bg-secondary py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-text-main" style={{ letterSpacing: '-0.02em' }}>Necə işləyir?</h2>
            <p className="mt-2 text-text-secondary">3 sadə addımda öyrənməyə başla</p>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {HOW_IT_WORKS.map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="relative flex flex-col items-center text-center">
                <div
                  className="mb-4 flex items-center justify-center text-white"
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 16,
                    background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                  }}
                >
                  <Icon size={26} strokeWidth={2} />
                </div>
                <span className="absolute -top-2 right-[calc(50%-52px)] text-xs font-bold text-primary/40">{step}</span>
                <h3 className="text-lg font-semibold text-text-main">{title}</h3>
                <p className="mt-2 text-sm text-text-secondary">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 sm:flex-row sm:justify-between">
          <span className="text-lg font-bold text-text-main">
            <span className="text-gradient">Glox</span> Platform
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
