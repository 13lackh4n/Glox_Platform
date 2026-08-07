import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

const COURSE_GRADIENTS = [
  'from-indigo-500 to-purple-600',
  'from-cyan-500 to-blue-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-amber-600',
  'from-pink-500 to-rose-600',
  'from-violet-500 to-indigo-600',
]

function CourseCardSkeleton() {
  return (
    <div className="flex animate-pulse flex-col rounded-xl border border-border bg-card overflow-hidden">
      <div className="h-2 bg-hover" />
      <div className="flex flex-col gap-3 p-5">
        <div className="h-5 w-3/4 rounded bg-hover" />
        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-hover" />
          <div className="h-3 w-5/6 rounded bg-hover" />
        </div>
        <div className="flex justify-between">
          <div className="h-6 w-16 rounded-full bg-hover" />
          <div className="h-6 w-24 rounded-full bg-hover" />
        </div>
        <div className="h-9 w-full rounded-lg bg-hover" />
      </div>
    </div>
  )
}

export default function Courses() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    async function fetchCourses() {
      const { data: coursesData } = await supabase
        .from('courses')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      const enriched = await Promise.all(
        (coursesData ?? []).map(async (course) => {
          const { count } = await supabase
            .from('enrollments')
            .select('id', { count: 'exact', head: true })
            .eq('course_id', course.id)
          return { ...course, studentCount: count ?? 0 }
        })
      )
      setCourses(enriched)
      setLoading(false)
    }
    fetchCourses()
  }, [])

  const filtered = useMemo(() => {
    let list = courses
    if (filter === 'open') list = list.filter((c) => c.enrollment_type === 'open')
    if (filter === 'request') list = list.filter((c) => c.enrollment_type !== 'open')
    const q = search.trim().toLowerCase()
    if (q) list = list.filter((c) => c.title.toLowerCase().includes(q))
    return list
  }, [courses, search, filter])

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Kurslar</h1>
          <p className="mt-1 text-text-secondary">
            {courses.length} kurs mövcuddur
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* Filter */}
          <div className="flex rounded-lg border border-border bg-card p-1">
            {[
              { key: 'all', label: 'Hamısı' },
              { key: 'open', label: '🔓 Açıq' },
              { key: 'request', label: '🔒 Müraciət' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={[
                  'rounded-md px-3 py-1.5 text-sm font-medium transition',
                  filter === f.key
                    ? 'bg-primary text-white'
                    : 'text-text-secondary hover:text-text-main',
                ].join(' ')}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Kurs axtar..."
              className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm text-text-main placeholder-text-secondary outline-none transition focus:border-primary sm:w-56"
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <CourseCardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={search ? '🔍' : '📚'}
          title={search ? 'Heç bir kurs tapılmadı' : 'Hələ kurs yoxdur'}
          description={search ? 'Başqa açar sözlə axtarmağı sınayın.' : 'Tezliklə yeni kurslar əlavə olunacaq.'}
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course, idx) => (
            <div
              key={course.id}
              className="group flex flex-col rounded-xl border border-border bg-card overflow-hidden transition-all duration-200 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-0.5"
            >
              {/* Gradient header */}
              <div
                className={`h-2 bg-gradient-to-r ${COURSE_GRADIENTS[idx % COURSE_GRADIENTS.length]}`}
              />
              <div className="flex flex-1 flex-col gap-3 p-5">
                <h3 className="font-semibold text-text-main leading-snug">{course.title}</h3>
                <p className="line-clamp-2 text-sm text-text-secondary flex-1">
                  {course.description}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1.5 rounded-full bg-secondary/10 px-2.5 py-1 text-xs font-medium text-secondary">
                    ⏱ {course.duration_months} ay
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full bg-border px-2.5 py-1 text-xs font-medium text-text-secondary">
                    👥 {course.studentCount} tələbə
                  </span>
                  <span
                    className={[
                      'rounded-full px-2.5 py-1 text-xs font-medium',
                      course.enrollment_type === 'open'
                        ? 'bg-success/10 text-success'
                        : 'bg-warning/10 text-warning',
                    ].join(' ')}
                  >
                    {course.enrollment_type === 'open' ? '🔓 Açıq' : '🔒 Müraciət'}
                  </span>
                </div>
                <Link
                  to={`/courses/${course.id}`}
                  className="mt-1 rounded-lg bg-primary/10 px-4 py-2.5 text-center text-sm font-medium text-primary transition hover:bg-primary hover:text-white"
                >
                  Ətraflı bax →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
