import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

function StatCard({ label, value, icon }) {
  return (
    <div className="rounded-xl border border-white/10 bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">{label}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <p className="mt-2 text-3xl font-bold text-text-main">{value}</p>
    </div>
  )
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ courses: 0, students: 0, tests: 0, results: 0 })
  const [recentUsers, setRecentUsers] = useState([])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      const [coursesRes, studentsRes, testsRes, resultsRes, recentUsersRes] = await Promise.all([
        supabase.from('courses').select('id', { count: 'exact', head: true }),
        supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'student'),
        supabase.from('tests').select('id', { count: 'exact', head: true }),
        supabase.from('results').select('id', { count: 'exact', head: true }),
        supabase
          .from('users')
          .select('id, full_name, email, role, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      setStats({
        courses: coursesRes.count ?? 0,
        students: studentsRes.count ?? 0,
        tests: testsRes.count ?? 0,
        results: resultsRes.count ?? 0,
      })
      setRecentUsers(recentUsersRes.data ?? [])
      setLoading(false)
    }

    fetchData()
  }, [])

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-main sm:text-3xl">Admin Paneli</h1>
        <p className="mt-1 text-text-secondary">Platformanın ümumi vəziyyəti</p>
      </div>

      {loading ? (
        <p className="text-text-secondary">Yüklənir...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Kurslar" value={stats.courses} icon="📚" />
            <StatCard label="Tələbələr" value={stats.students} icon="👥" />
            <StatCard label="Testlər" value={stats.tests} icon="📝" />
            <StatCard label="Nəticələr" value={stats.results} icon="📊" />
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/admin/courses"
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
            >
              Kursları idarə et
            </Link>
            <Link
              to="/admin/users"
              className="rounded-lg border border-white/10 px-5 py-2.5 text-sm font-medium text-text-main transition hover:bg-card"
            >
              İstifadəçilər
            </Link>
            <Link
              to="/admin/instructors"
              className="rounded-lg border border-white/10 px-5 py-2.5 text-sm font-medium text-text-main transition hover:bg-card"
            >
              Təlimçilər
            </Link>
            <Link
              to="/admin/stats"
              className="rounded-lg border border-white/10 px-5 py-2.5 text-sm font-medium text-text-main transition hover:bg-card"
            >
              Statistika
            </Link>
          </div>

          <div className="mt-10">
            <h2 className="mb-4 text-xl font-bold text-text-main">Son qeydiyyatlar</h2>
            {recentUsers.length === 0 ? (
              <p className="text-text-secondary">Hələ heç bir istifadəçi yoxdur.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-white/10 bg-card">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-text-secondary">
                      <th className="px-4 py-3 font-medium">Ad</th>
                      <th className="px-4 py-3 font-medium">E-poçt</th>
                      <th className="px-4 py-3 font-medium">Rol</th>
                      <th className="px-4 py-3 font-medium">Tarix</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentUsers.map((u) => (
                      <tr key={u.id} className="border-b border-white/5 last:border-0">
                        <td className="px-4 py-3 text-text-main">{u.full_name ?? '—'}</td>
                        <td className="px-4 py-3 text-text-secondary">{u.email}</td>
                        <td className="px-4 py-3 text-text-secondary">{u.role}</td>
                        <td className="px-4 py-3 text-text-secondary">
                          {new Date(u.created_at).toLocaleDateString('az-AZ')}
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
