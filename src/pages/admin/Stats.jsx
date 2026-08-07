import { useEffect, useState } from 'react'
import { GraduationCap, Users, FileText, Trophy } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import StatCard from '../../components/ui/StatCard'
import Spinner from '../../components/ui/Spinner'

const MONTH_LABELS = [
  'Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn',
  'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek',
]

function buildLastSixMonths() {
  const now = new Date()
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ year: d.getFullYear(), month: d.getMonth(), count: 0 })
  }
  return months
}

export default function AdminStats() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ courses: 0, students: 0, tests: 0, results: 0 })
  const [monthly, setMonthly] = useState([])
  const [topStudents, setTopStudents] = useState([])
  const [courseDistribution, setCourseDistribution] = useState([])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      const [coursesRes, studentsRes, testsRes, resultsRes, allUsersRes, coursesListRes] =
        await Promise.all([
          supabase.from('courses').select('id', { count: 'exact', head: true }),
          supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'student'),
          supabase.from('tests').select('id', { count: 'exact', head: true }),
          supabase.from('results').select('id', { count: 'exact', head: true }),
          supabase.from('users').select('created_at'),
          supabase.from('courses').select('id, title'),
        ])

      setStats({
        courses: coursesRes.count ?? 0,
        students: studentsRes.count ?? 0,
        tests: testsRes.count ?? 0,
        results: resultsRes.count ?? 0,
      })

      const months = buildLastSixMonths()
      ;(allUsersRes.data ?? []).forEach((u) => {
        const d = new Date(u.created_at)
        const bucket = months.find(
          (m) => m.year === d.getFullYear() && m.month === d.getMonth()
        )
        if (bucket) bucket.count += 1
      })
      setMonthly(months)

      const { data: topResults } = await supabase
        .from('results')
        .select('id, user_id, test_id, score, total_possible, percentage, completed_at')
        .order('percentage', { ascending: false })
        .limit(5)

      const userIds = [...new Set((topResults ?? []).map((r) => r.user_id))]
      const testIds = [...new Set((topResults ?? []).map((r) => r.test_id))]

      let usersById = {}
      let testsById = {}
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, full_name, email')
          .in('id', userIds)
        usersById = Object.fromEntries((usersData ?? []).map((u) => [u.id, u]))
      }
      if (testIds.length > 0) {
        const { data: testsData } = await supabase
          .from('tests')
          .select('id, title')
          .in('id', testIds)
        testsById = Object.fromEntries((testsData ?? []).map((t) => [t.id, t]))
      }

      setTopStudents(
        (topResults ?? []).map((r) => ({
          ...r,
          studentName: usersById[r.user_id]?.full_name ?? usersById[r.user_id]?.email ?? '—',
          testTitle: testsById[r.test_id]?.title ?? '—',
        }))
      )

      const courses = coursesListRes.data ?? []
      if (courses.length > 0) {
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('course_id')
          .in('course_id', courses.map((c) => c.id))

        const counts = {}
        ;(enrollments ?? []).forEach((e) => {
          counts[e.course_id] = (counts[e.course_id] ?? 0) + 1
        })

        setCourseDistribution(
          courses
            .map((c) => ({ title: c.title, count: counts[c.id] ?? 0 }))
            .sort((a, b) => b.count - a.count)
        )
      }

      setLoading(false)
    }

    fetchData()
  }, [])

  const maxMonthly = Math.max(1, ...monthly.map((m) => m.count))
  const maxDistribution = Math.max(1, ...courseDistribution.map((c) => c.count))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-text-main">Ümumi Statistika</h1>
        <p className="mt-1 text-text-secondary">Platformanın performans göstəriciləri</p>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon={GraduationCap} label="Kurslar" value={stats.courses} color="indigo" />
            <StatCard icon={Users} label="Tələbələr" value={stats.students} color="cyan" />
            <StatCard icon={FileText} label="Testlər" value={stats.tests} color="green" />
            <StatCard icon={Trophy} label="Nəticələr" value={stats.results} color="orange" />
          </div>

          {/* Monthly registrations */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-6 text-lg font-bold text-text-main">
              Aylıq qeydiyyat (son 6 ay)
            </h2>
            <div className="flex items-end justify-between gap-3 sm:gap-6" style={{ height: 180 }}>
              {monthly.map((m, idx) => (
                <div key={idx} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-xs font-medium text-text-secondary">{m.count}</span>
                  <div
                    className="w-full max-w-10 rounded-t-md bg-primary transition-all"
                    style={{ height: `${(m.count / maxMonthly) * 130 + 4}px` }}
                  />
                  <span className="text-xs text-text-secondary">
                    {MONTH_LABELS[m.month]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Top students */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="mb-4 text-lg font-bold text-text-main">
                Ən yaxşı nəticəli tələbələr
              </h2>
              {topStudents.length === 0 ? (
                <p className="text-sm text-text-secondary">Hələ heç bir nəticə yoxdur.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {topStudents.map((r, idx) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between gap-3 rounded-lg bg-bg px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-text-main">
                            {r.studentName}
                          </p>
                          <p className="truncate text-xs text-text-secondary">{r.testTitle}</p>
                        </div>
                      </div>
                      <span className="shrink-0 text-sm font-bold text-success">
                        {Math.round(r.percentage)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Course distribution */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="mb-4 text-lg font-bold text-text-main">
                Kurs üzrə tələbə paylanması
              </h2>
              {courseDistribution.length === 0 ? (
                <p className="text-sm text-text-secondary">Hələ heç bir kurs yoxdur.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {courseDistribution.map((c) => (
                    <div key={c.title}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="truncate text-text-main">{c.title}</span>
                        <span className="shrink-0 text-text-secondary">{c.count} tələbə</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-bg">
                        <div
                          className="h-full rounded-full bg-secondary transition-all"
                          style={{ width: `${(c.count / maxDistribution) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
