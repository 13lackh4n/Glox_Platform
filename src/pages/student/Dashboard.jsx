import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

export default function Dashboard() {
  const { user, profile } = useAuth()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    async function fetchDashboard() {
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('id, status, enrolled_at, courses(*)')
        .eq('user_id', user.id)
        .order('enrolled_at', { ascending: false })

      const enriched = await Promise.all(
        (enrollments ?? [])
          .filter((e) => e.courses)
          .map(async (enrollment) => {
            const course = enrollment.courses

            const { data: tests } = await supabase
              .from('tests')
              .select('id, title, month, duration_minutes')
              .eq('course_id', course.id)
              .eq('is_active', true)
              .order('month', { ascending: true })

            const testIds = (tests ?? []).map((t) => t.id)

            let completedCount = 0
            if (testIds.length > 0) {
              const { data: results } = await supabase
                .from('results')
                .select('test_id')
                .eq('user_id', user.id)
                .in('test_id', testIds)
              completedCount = new Set((results ?? []).map((r) => r.test_id)).size
            }

            const totalTests = tests?.length ?? 0
            const progress = totalTests > 0 ? Math.round((completedCount / totalTests) * 100) : 0

            return {
              enrollment,
              course,
              tests: tests ?? [],
              completedCount,
              totalTests,
              progress,
            }
          })
      )

      setCourses(enriched)
      setLoading(false)
    }

    fetchDashboard()
  }, [user])

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-main sm:text-3xl">
          Xoş gəldiniz, {profile?.full_name ?? 'Tələbə'}
        </h1>
        <p className="mt-1 text-text-secondary">Yazıldığınız kursların icmalı</p>
      </div>

      {loading ? (
        <p className="text-text-secondary">Yüklənir...</p>
      ) : courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-white/10 bg-card px-6 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-3xl">
            📚
          </div>
          <h2 className="text-lg font-semibold text-text-main">
            Hələ heç bir kursa yazılmamısınız
          </h2>
          <p className="max-w-sm text-sm text-text-secondary">
            Mövcud kurslara baxın və öyrənməyə bu gün başlayın.
          </p>
          <Link
            to="/courses"
            className="mt-2 rounded-lg bg-primary px-5 py-2.5 font-medium text-white transition hover:opacity-90"
          >
            Kurslara bax
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map(({ enrollment, course, tests, completedCount, totalTests, progress }) => (
              <div
                key={enrollment.id}
                className="flex flex-col gap-4 rounded-xl border border-white/10 bg-card p-6 transition hover:border-primary/50"
              >
                <div>
                  <h3 className="text-lg font-semibold text-text-main">{course.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-text-secondary">
                    {course.description}
                  </p>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs text-text-secondary">
                    <span>Proqres</span>
                    <span>
                      {completedCount}/{totalTests} test · {progress}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-bg">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {tests.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-text-secondary">
                      Aktiv testlər
                    </span>
                    <ul className="flex flex-col gap-1">
                      {tests.slice(0, 3).map((test) => (
                        <li key={test.id}>
                          <Link
                            to={`/test/${test.id}`}
                            className="flex items-center justify-between rounded-lg bg-bg px-3 py-2 text-sm text-text-main transition hover:bg-primary/10"
                          >
                            <span className="truncate">{test.title}</span>
                            <span className="ml-2 shrink-0 text-xs text-secondary">
                              {test.duration_minutes} dəq
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Link
                  to={`/courses/${course.id}`}
                  className="mt-auto rounded-lg border border-white/10 px-4 py-2 text-center text-sm font-medium text-text-main transition hover:bg-primary hover:text-white"
                >
                  Kursa bax
                </Link>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link to="/courses" className="text-sm font-medium text-primary hover:underline">
              Bütün kursları gör →
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
