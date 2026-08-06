import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

function CourseCardSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-4 rounded-xl border border-white/10 bg-card p-6">
      <div className="h-5 w-3/4 rounded bg-white/10" />
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-white/10" />
        <div className="h-3 w-5/6 rounded bg-white/10" />
      </div>
      <div className="flex justify-between">
        <div className="h-3 w-16 rounded bg-white/10" />
        <div className="h-3 w-16 rounded bg-white/10" />
      </div>
      <div className="h-9 w-full rounded-lg bg-white/10" />
    </div>
  )
}

export default function Courses() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

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

  const filteredCourses = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return courses
    return courses.filter((course) => course.title.toLowerCase().includes(query))
  }, [courses, search])

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-main sm:text-3xl">Bütün Kurslar</h1>
          <p className="mt-1 text-text-secondary">Elektronika sahəsində peşəkar kurslar</p>
        </div>

        <div className="relative sm:w-72">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <circle cx="11" cy="11" r="7" strokeWidth="2" />
            <path d="m21 21-4.3-4.3" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Kurs adı üzrə axtar..."
            className="w-full rounded-lg border border-white/10 bg-card py-2.5 pl-9 pr-3 text-sm text-text-main outline-none transition focus:border-primary"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CourseCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/10 bg-card px-6 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-3xl">
            🔍
          </div>
          <h2 className="text-lg font-semibold text-text-main">
            {search ? 'Heç bir kurs tapılmadı' : 'Hələ heç bir kurs əlavə edilməyib'}
          </h2>
          <p className="max-w-sm text-sm text-text-secondary">
            {search
              ? 'Başqa açar sözlə axtarmağı sınayın.'
              : 'Tezliklə yeni kurslar əlavə olunacaq.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCourses.map((course) => (
            <div
              key={course.id}
              className="flex flex-col gap-4 rounded-xl border border-white/10 bg-card p-6 transition hover:border-primary/50"
            >
              <div>
                <h3 className="text-lg font-semibold text-text-main">{course.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm text-text-secondary">
                  {course.description}
                </p>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-secondary">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="9" strokeWidth="2" />
                    <path d="M12 7v5l3 3" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  {course.duration_months} ay
                </span>
                <span className="flex items-center gap-1.5 text-text-secondary">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      d="M17 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <circle cx="10" cy="7" r="4" strokeWidth="2" />
                  </svg>
                  {course.studentCount} tələbə
                </span>
              </div>

              <Link
                to={`/courses/${course.id}`}
                className="mt-auto rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-medium text-white transition hover:opacity-90"
              >
                Kursa bax
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
