import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { GraduationCap, Users, FileText, Trophy, BarChart3, Medal } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import StatCard from '../../components/ui/StatCard'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

const PIE_COLORS = ['#6366f1', '#22d3ee', '#22c55e', '#f59e0b', '#ef4444', '#a855f7']

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ courses: 0, students: 0, tests: 0, results: 0 })
  const [recentUsers, setRecentUsers] = useState([])
  const [topResults, setTopResults] = useState([])
  const [monthlyData, setMonthlyData] = useState([])
  const [courseDistrib, setCourseDistrib] = useState([])

  useEffect(() => {
    async function fetchData() {
      try {
        const [coursesRes, studentsRes, testsRes, resultsRes, recentUsersRes, topRes, allEnrollRes] =
          await Promise.all([
            supabase.from('courses').select('id, title', { count: 'exact' }),
            supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'student'),
            supabase.from('tests').select('id', { count: 'exact', head: true }),
            supabase.from('results').select('id', { count: 'exact', head: true }),
            supabase
              .from('users')
              .select('id, full_name, email, role, created_at')
              .order('created_at', { ascending: false })
              .limit(5),
            supabase
              .from('results')
              .select('score, total_possible, percentage, users(full_name), tests(title)')
              .order('score', { ascending: false })
              .limit(5),
            supabase
              .from('enrollments')
              .select('enrolled_at, course_id, courses(title)')
              .order('enrolled_at', { ascending: false }),
          ])

        setStats({
          courses: coursesRes.count ?? 0,
          students: studentsRes.count ?? 0,
          tests: testsRes.count ?? 0,
          results: resultsRes.count ?? 0,
        })
        setRecentUsers(recentUsersRes.data ?? [])
        setTopResults(topRes.data ?? [])

        // Monthly registrations (last 6 months)
        const now = new Date()
        const months = Array.from({ length: 6 }, (_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
          return { name: d.toLocaleString('az-AZ', { month: 'short' }), count: 0, m: d.getMonth(), y: d.getFullYear() }
        })
        for (const e of allEnrollRes.data ?? []) {
          const d = new Date(e.enrolled_at)
          const entry = months.find((m) => m.m === d.getMonth() && m.y === d.getFullYear())
          if (entry) entry.count++
        }
        setMonthlyData(months)

        // Course distribution
        const courseMap = {}
        for (const e of allEnrollRes.data ?? []) {
          const title = e.courses?.title ?? 'Digər'
          courseMap[title] = (courseMap[title] || 0) + 1
        }
        setCourseDistrib(
          Object.entries(courseMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5)
        )
      } catch (err) {
        console.error('Admin dashboard fetch failed:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-text-main">Admin Paneli</h1>
        <p className="mt-1 text-text-secondary">Platformanın ümumi vəziyyəti</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={GraduationCap} value={stats.courses} label="Kurslar" color="indigo" trend={0} />
        <StatCard icon={Users} value={stats.students} label="Tələbələr" color="cyan" trend={0} />
        <StatCard icon={FileText} value={stats.tests} label="Testlər" color="green" trend={0} />
        <StatCard icon={Trophy} value={stats.results} label="Nəticələr" color="orange" trend={0} />
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-3">
        <Link to="/admin/courses" className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-hover active:scale-[0.98]">
          <GraduationCap size={16} strokeWidth={2} /> Kurslar
        </Link>
        <Link to="/admin/users" className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-text-main transition hover:bg-hover active:scale-[0.98]">
          <Users size={16} strokeWidth={2} /> İstifadəçilər
        </Link>
        <Link to="/admin/instructors" className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-text-main transition hover:bg-hover active:scale-[0.98]">
          <GraduationCap size={16} strokeWidth={2} /> Təlimçilər
        </Link>
        <Link to="/admin/stats" className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-text-main transition hover:bg-hover active:scale-[0.98]">
          <BarChart3 size={16} strokeWidth={2} /> Statistika
        </Link>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 font-semibold text-text-main">Aylıq qeydiyyatlar</h2>
          {monthlyData.some((m) => m.count > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 8,
                    color: 'var(--text-primary)',
                  }}
                />
                <Bar dataKey="count" name="Qeydiyyat" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-sm text-text-secondary">Məlumat yoxdur</p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 font-semibold text-text-main">Kurs üzrə tələbə paylanması</h2>
          {courseDistrib.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={courseDistrib}
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name.slice(0, 8)}… ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {courseDistrib.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 8,
                    color: 'var(--text-primary)',
                  }}
                />
                <Legend
                  formatter={(v) => <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-sm text-text-secondary">Məlumat yoxdur</p>
          )}
        </div>
      </div>

      {/* Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent users */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-semibold text-text-main">Son qeydiyyatlar</h2>
          </div>
          {recentUsers.length === 0 ? (
            <p className="px-5 py-8 text-sm text-text-secondary">İstifadəçi yoxdur</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-secondary">
                  <th className="px-4 py-3 text-left font-medium">Ad</th>
                  <th className="px-4 py-3 text-left font-medium">Rol</th>
                  <th className="px-4 py-3 text-left font-medium">Tarix</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((u) => (
                  <tr key={u.id} className="border-b border-border/50 last:border-0 hover:bg-hover/40 transition">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-text-main">{u.full_name ?? '—'}</p>
                        <p className="text-xs text-text-secondary">{u.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          u.role === 'super_admin' ? 'primary' : u.role === 'instructor' ? 'secondary' : 'success'
                        }
                      >
                        {u.role === 'super_admin' ? 'Admin' : u.role === 'instructor' ? 'Təlimçi' : 'Tələbə'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {new Date(u.created_at).toLocaleDateString('az-AZ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Top results */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-semibold text-text-main">Ən yaxşı nəticələr (Top 5)</h2>
          </div>
          {topResults.length === 0 ? (
            <p className="px-5 py-8 text-sm text-text-secondary">Nəticə yoxdur</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-secondary">
                  <th className="px-4 py-3 text-left font-medium">Tələbə</th>
                  <th className="px-4 py-3 text-left font-medium">Bal</th>
                  <th className="px-4 py-3 text-left font-medium">Faiz</th>
                </tr>
              </thead>
              <tbody>
                {topResults.map((r, i) => {
                  const pct = Math.round(r.percentage ?? 0)
                  return (
                    <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-hover/40 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {i < 3 ? (
                            <Medal
                              size={16}
                              strokeWidth={2}
                              style={{ color: ['#facc15', '#a1a1aa', '#d97706'][i] }}
                            />
                          ) : (
                            <span className="w-4 text-center text-xs text-text-muted">{i + 1}</span>
                          )}
                          <span className="font-medium text-text-main">{r.users?.full_name ?? '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {r.score}/{r.total_possible}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-success">{pct}%</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
