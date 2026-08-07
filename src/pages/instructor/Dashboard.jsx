import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

function StatCard({ label, value, icon }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">{label}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <p className="mt-2 text-3xl font-bold text-text-main">{value}</p>
    </div>
  )
}

export default function InstructorDashboard() {
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ courses: 0, students: 0, tests: 0 })
  const [recentResults, setRecentResults] = useState([])

  useEffect(() => {
    if (!user) return

    async function fetchData() {
      setLoading(true)

      const { data: courses } = await supabase
        .from('courses')
        .select('id, title')
        .eq('instructor_id', user.id)

      const courseIds = (courses ?? []).map((c) => c.id)

      let studentCount = 0
      let testCount = 0
      let results = []

      if (courseIds.length > 0) {
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('user_id')
          .in('course_id', courseIds)
        studentCount = new Set((enrollments ?? []).map((e) => e.user_id)).size

        const { data: tests } = await supabase
          .from('tests')
          .select('id, title, course_id')
          .in('course_id', courseIds)
        testCount = tests?.length ?? 0

        const testIds = (tests ?? []).map((t) => t.id)
        if (testIds.length > 0) {
          const { data: resultsData } = await supabase
            .from('results')
            .select('id, score, total_possible, percentage, completed_at, user_id, test_id')
            .in('test_id', testIds)
            .order('completed_at', { ascending: false })
            .limit(5)

          const userIds = [...new Set((resultsData ?? []).map((r) => r.user_id))]
          let usersById = {}
          if (userIds.length > 0) {
            const { data: usersData } = await supabase
              .from('users')
              .select('id, full_name, email')
              .in('id', userIds)
            usersById = Object.fromEntries((usersData ?? []).map((u) => [u.id, u]))
          }

          results = (resultsData ?? []).map((r) => ({
            ...r,
            testTitle: tests.find((t) => t.id === r.test_id)?.title ?? '—',
            studentName: usersById[r.user_id]?.full_name ?? usersById[r.user_id]?.email ?? '—',
          }))
        }
      }

      setStats({ courses: courses?.length ?? 0, students: studentCount, tests: testCount })
      setRecentResults(results)
      setLoading(false)
    }

    fetchData()
  }, [user])

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-main sm:text-3xl">
          Xoş gəldiniz, {profile?.full_name ?? 'Təlimçi'}
        </h1>
        <p className="mt-1 text-text-secondary">Kurslarınızın icmalı</p>
      </div>

      {loading ? (
        <p className="text-text-secondary">Yüklənir...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Kurslarım" value={stats.courses} icon="📚" />
            <StatCard label="Ümumi tələbə" value={stats.students} icon="👥" />
            <StatCard label="Ümumi test" value={stats.tests} icon="📝" />
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/instructor/tests/create"
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
            >
              + Yeni test yarat
            </Link>
            <Link
              to="/instructor/courses"
              className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-text-main transition hover:bg-card"
            >
              Kurslarım
            </Link>
            <Link
              to="/instructor/students"
              className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-text-main transition hover:bg-card"
            >
              Tələbələr
            </Link>
            <Link
              to="/instructor/results"
              className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-text-main transition hover:bg-card"
            >
              Nəticələr
            </Link>
          </div>

          <div className="mt-10">
            <h2 className="mb-4 text-xl font-bold text-text-main">Son nəticələr</h2>
            {recentResults.length === 0 ? (
              <p className="text-text-secondary">Hələ heç bir nəticə yoxdur.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border bg-card">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-text-secondary">
                      <th className="px-4 py-3 font-medium">Tələbə</th>
                      <th className="px-4 py-3 font-medium">Test</th>
                      <th className="px-4 py-3 font-medium">Bal</th>
                      <th className="px-4 py-3 font-medium">Faiz</th>
                      <th className="px-4 py-3 font-medium">Tarix</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentResults.map((r) => (
                      <tr key={r.id} className="border-b border-white/5 last:border-0">
                        <td className="px-4 py-3 text-text-main">{r.studentName}</td>
                        <td className="px-4 py-3 text-text-secondary">{r.testTitle}</td>
                        <td className="px-4 py-3 text-text-secondary">
                          {r.score}/{r.total_possible}
                        </td>
                        <td className="px-4 py-3 text-text-secondary">
                          {Math.round(r.percentage)}%
                        </td>
                        <td className="px-4 py-3 text-text-secondary">
                          {new Date(r.completed_at).toLocaleDateString('az-AZ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
