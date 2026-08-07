import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import StatCard from '../../components/ui/StatCard'
import EmptyState from '../../components/ui/EmptyState'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts'

function greeting(name) {
  const h = new Date().getHours()
  const time = h < 12 ? 'Sabahınız xeyir' : h < 17 ? 'Günortanız xeyir' : 'Axşamınız xeyir'
  const icon = h < 12 ? '🌅' : h < 17 ? '☀️' : '🌙'
  return `${time}, ${name ?? 'Tələbə'}! ${icon}`
}

export default function Dashboard() {
  const { user, profile } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    async function fetchAll() {
      const [enrollRes, reqRes, resultRes] = await Promise.all([
        supabase
          .from('enrollments')
          .select('id, status, enrolled_at, courses(*)')
          .eq('user_id', user.id)
          .order('enrolled_at', { ascending: false }),
        supabase
          .from('enrollment_requests')
          .select('*, courses(title)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('results')
          .select('id, score, max_score, created_at, tests(title, course_id, month)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20),
      ])

      const enrollments = enrollRes.data ?? []
      const allResults = resultRes.data ?? []
      const requests = reqRes.data ?? []

      const enriched = await Promise.all(
        enrollments
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
              const { data: res } = await supabase
                .from('results')
                .select('test_id')
                .eq('user_id', user.id)
                .in('test_id', testIds)
              completedCount = new Set((res ?? []).map((r) => r.test_id)).size
            }
            const progress =
              tests?.length > 0 ? Math.round((completedCount / tests.length) * 100) : 0
            return { enrollment, course, tests: tests ?? [], completedCount, progress }
          })
      )

      // Monthly chart data (last 6 months)
      const now = new Date()
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
        return {
          name: d.toLocaleString('az-AZ', { month: 'short' }),
          month: d.getMonth(),
          year: d.getFullYear(),
          count: 0,
          avg: 0,
        }
      })
      for (const r of allResults) {
        const d = new Date(r.created_at)
        const entry = months.find(
          (m) => m.month === d.getMonth() && m.year === d.getFullYear()
        )
        if (entry) {
          entry.count++
          entry.avg =
            (entry.avg * (entry.count - 1) +
              Math.round((r.score / (r.max_score || 1)) * 100)) /
            entry.count
        }
      }

      const totalXP = allResults.reduce((acc, r) => acc + (r.score ?? 0), 0)
      const avgPct =
        allResults.length > 0
          ? Math.round(
              allResults.reduce(
                (a, r) => a + Math.round((r.score / (r.max_score || 1)) * 100),
                0
              ) / allResults.length
            )
          : 0

      setData({
        courses: enriched,
        pendingRequests: requests.filter((r) => r.status === 'pending'),
        rejectedRequests: requests.filter((r) => r.status === 'rejected'),
        recentResults: allResults.slice(0, 5),
        chartData: months.map((m) => ({ ...m, avg: Math.round(m.avg) })),
        stats: {
          courses: enrollments.length,
          tests: allResults.length,
          xp: totalXP,
          avg: avgPct,
        },
      })
      setLoading(false)
    }
    fetchAll()
  }, [user])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  const { courses, pendingRequests, rejectedRequests, recentResults, chartData, stats } =
    data ?? {}

  return (
    <div className="flex flex-col gap-6">
      {/* Greeting */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h1 className="text-2xl font-bold text-text-main">
          {greeting(profile?.full_name)}
        </h1>
        <p className="mt-1 text-text-secondary">
          Yazıldığınız kursların icmalı — uğurlar! 💪
        </p>
      </div>

      {/* Requests alerts */}
      {(pendingRequests?.length > 0 || rejectedRequests?.length > 0) && (
        <div className="flex flex-col gap-2">
          {pendingRequests.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3"
            >
              <Badge variant="warning">Gözləyir</Badge>
              <span className="text-sm text-text-main">
                <strong>{r.courses?.title}</strong> kursuna müraciətiniz nəzərdən keçirilir.
              </span>
            </div>
          ))}
          {rejectedRequests.map((r) => (
            <div
              key={r.id}
              className="flex flex-col gap-1 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <Badge variant="danger">Rədd edilib</Badge>
                <span className="text-sm text-text-main">
                  <strong>{r.courses?.title}</strong> müraciətiniz rədd edildi.
                </span>
              </div>
              {r.admin_note && (
                <p className="pl-1 text-xs text-danger/80">Səbəb: {r.admin_note}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon="📚" value={stats.courses} label="Yazıldığı kurs" color="primary" />
        <StatCard icon="📝" value={stats.tests} label="Tamamlanan test" color="secondary" />
        <StatCard icon="⚡" value={stats.xp} label="Ümumi XP" color="warning" />
        <StatCard icon="📊" value={`${stats.avg}%`} label="Orta faiz" color="success" />
      </div>

      {/* Charts + Active courses */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Line chart */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 font-semibold text-text-main">Son 6 ayın nəticələri</h2>
          {chartData && chartData.some((d) => d.count > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 8,
                    color: 'var(--text-primary)',
                  }}
                  formatter={(v) => [`${v}%`, 'Orta bal']}
                />
                <Line
                  type="monotone"
                  dataKey="avg"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  dot={{ fill: 'var(--accent)', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-sm text-text-secondary">
              Hələ nəticə yoxdur
            </p>
          )}
        </div>

        {/* Active courses */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-text-main">Aktiv kurslar</h2>
            <Link to="/courses" className="text-xs text-primary hover:underline">Hamısı</Link>
          </div>
          {courses?.length === 0 ? (
            <EmptyState
              icon="📚"
              title="Kurs yoxdur"
              description="Kurslara baxın"
              action={
                <Link to="/courses" className="text-sm text-primary hover:underline">
                  Kurslara bax →
                </Link>
              }
            />
          ) : (
            <div className="flex flex-col gap-4">
              {courses.slice(0, 3).map(({ enrollment, course, tests, completedCount, progress }) => (
                <div key={enrollment.id}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium text-text-main truncate max-w-[140px]">
                      {course.title}
                    </span>
                    <span className="text-xs text-text-secondary">{progress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-bg">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-xs text-text-secondary">
                      {completedCount}/{tests.length} test
                    </span>
                    {tests.length > completedCount && (
                      <Link
                        to={`/test/${tests[completedCount]?.id}`}
                        className="text-xs text-primary hover:underline"
                      >
                        Davam et →
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent results */}
      {recentResults?.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-text-main">Son nəticələr</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-border text-text-secondary">
                  <th className="px-5 py-3 text-left font-medium">Test</th>
                  <th className="px-5 py-3 text-left font-medium">Bal</th>
                  <th className="px-5 py-3 text-left font-medium">Faiz</th>
                  <th className="px-5 py-3 text-left font-medium">Tarix</th>
                </tr>
              </thead>
              <tbody>
                {recentResults.map((r) => {
                  const pct = Math.round((r.score / (r.max_score || 1)) * 100)
                  return (
                    <tr key={r.id} className="border-b border-border/50 last:border-0 hover:bg-hover/50 transition">
                      <td className="px-5 py-3 text-text-main">{r.tests?.title ?? '—'}</td>
                      <td className="px-5 py-3 text-text-secondary">
                        {r.score}/{r.max_score}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={[
                            'font-semibold',
                            pct >= 70 ? 'text-success' : pct >= 50 ? 'text-warning' : 'text-danger',
                          ].join(' ')}
                        >
                          {pct}%
                        </span>
                      </td>
                      <td className="px-5 py-3 text-text-secondary">
                        {new Date(r.created_at).toLocaleDateString('az-AZ')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Full courses grid */}
      {courses?.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-text-main">Kurslarım</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map(({ enrollment, course, tests, completedCount, progress }) => (
              <div
                key={enrollment.id}
                className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 transition hover:border-primary/40"
              >
                <div>
                  <h3 className="font-semibold text-text-main">{course.title}</h3>
                  <p className="mt-1 line-clamp-2 text-xs text-text-secondary">
                    {course.description}
                  </p>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs text-text-secondary">
                    <span>Proqres</span>
                    <span>{completedCount}/{tests.length} · {progress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-bg">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                {tests.length > 0 && tests.slice(0, 2).map((t) => (
                  <Link
                    key={t.id}
                    to={`/test/${t.id}`}
                    className="flex items-center justify-between rounded-lg bg-bg px-3 py-2 text-xs text-text-main hover:bg-primary/10 transition"
                  >
                    <span className="truncate">{t.title}</span>
                    <span className="ml-2 shrink-0 text-text-secondary">{t.duration_minutes}dəq</span>
                  </Link>
                ))}
                <Link
                  to={`/courses/${course.id}`}
                  className="mt-auto rounded-lg border border-border px-4 py-2 text-center text-sm font-medium text-text-main transition hover:bg-primary hover:text-white hover:border-primary"
                >
                  Kursa bax
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {courses?.length === 0 && !loading && (
        <EmptyState
          icon="📚"
          title="Hələ heç bir kursa yazılmamısınız"
          description="Mövcud kurslara baxın və öyrənməyə bu gün başlayın."
          action={
            <Link
              to="/courses"
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
            >
              Kurslara bax
            </Link>
          }
        />
      )}
    </div>
  )
}
