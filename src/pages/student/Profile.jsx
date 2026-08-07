import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import Tabs from '../../components/ui/Tabs'
import StatCard from '../../components/ui/StatCard'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const BADGES_CATALOG = [
  { id: 'first_test', icon: '🎯', label: 'İlk test', desc: 'İlk testi tamamladın', color: 'primary' },
  { id: 'five_tests', icon: '🔥', label: '5 test', desc: '5 test tamamladın', color: 'warning' },
  { id: 'ten_tests', icon: '💎', label: '10 test', desc: '10 test tamamladın', color: 'secondary' },
  { id: 'perfect', icon: '⭐', label: 'Mükəmməl', desc: 'Bir testdə 100%', color: 'success' },
  { id: 'consistent', icon: '📅', label: 'Davamlı', desc: '5 gün ardıcıl', color: 'primary' },
  { id: 'topper', icon: '🥇', label: 'Lider', desc: 'Liderboardda 1-ci', color: 'warning' },
]

export default function Profile() {
  const { user, profile } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    async function fetchProfile() {
      try {
        const [resultsRes, enrollRes] = await Promise.all([
          supabase
            .from('results')
            .select('id, score, total_possible, percentage, completed_at, tests(title, course_id, month, courses(title))')
            .eq('user_id', user.id)
            .order('completed_at', { ascending: false }),
          supabase
            .from('enrollments')
            .select('courses(title, id)')
            .eq('user_id', user.id),
        ])

        if (resultsRes.error) console.error('results fetch error:', resultsRes.error)
        if (enrollRes.error) console.error('enrollments fetch error:', enrollRes.error)

        const results = resultsRes.data ?? []
        const scores = results.map((r) => Math.round(r.percentage ?? 0))
        const total = results.length
        const avg = total > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / total) : 0
        const best = total > 0 ? Math.max(...scores) : 0
        const totalTime = total * 20

        // Monthly activity
        const now = new Date()
        const months = Array.from({ length: 6 }, (_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
          return { name: d.toLocaleString('az-AZ', { month: 'short' }), count: 0 }
        })
        for (const r of results) {
          const d = new Date(r.completed_at)
          const lbl = d.toLocaleString('az-AZ', { month: 'short' })
          const m = months.find((x) => x.name === lbl)
          if (m) m.count++
        }

        // Earned badges
        const earnedBadges = new Set()
        if (total >= 1) earnedBadges.add('first_test')
        if (total >= 5) earnedBadges.add('five_tests')
        if (total >= 10) earnedBadges.add('ten_tests')
        if (scores.some((s) => s === 100)) earnedBadges.add('perfect')

        setData({
          results,
          stats: { total, avg, best, totalTime },
          monthlyActivity: months,
          earnedBadges,
          enrollments: enrollRes.data ?? [],
        })
      } catch (err) {
        console.error('Profile fetch failed:', err)
        setData({
          results: [],
          stats: { total: 0, avg: 0, best: 0, totalTime: 0 },
          monthlyActivity: [],
          earnedBadges: new Set(),
          enrollments: [],
        })
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [user])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  const { results, stats, monthlyActivity, earnedBadges } = data ?? {}

  const roleLabelMap = {
    student: 'Tələbə',
    instructor: 'Təlimçi',
    super_admin: 'Admin',
  }

  const tabs = [
    {
      key: 'stats',
      label: 'Statistika',
      icon: '📊',
      content: (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon="📝" value={stats.total} label="Ümumi testlər" color="primary" />
            <StatCard icon="📊" value={`${stats.avg}%`} label="Orta bal" color="secondary" />
            <StatCard icon="🏆" value={`${stats.best}%`} label="Ən yüksək" color="success" />
            <StatCard icon="⏱" value={`${stats.totalTime}dəq`} label="Ümumi vaxt" color="warning" />
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-4 font-semibold text-text-main">Aylıq aktivlik</h3>
            {monthlyActivity?.some((m) => m.count > 0) ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={monthlyActivity}>
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
                    formatter={(v) => [v, 'Test']}
                  />
                  <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-sm text-text-secondary">
                Hələ aktivlik yoxdur
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'results',
      label: 'Nəticələr',
      icon: '🏆',
      badge: results?.length,
      content:
        results?.length === 0 ? (
          <EmptyState icon="📝" title="Hələ nəticə yoxdur" description="Test verdikdən sonra nəticələriniz burada görünəcək." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[540px] text-sm">
              <thead>
                <tr className="border-b border-border text-text-secondary">
                  <th className="px-5 py-3 text-left font-medium">Test</th>
                  <th className="px-5 py-3 text-left font-medium">Kurs</th>
                  <th className="px-5 py-3 text-left font-medium">Bal</th>
                  <th className="px-5 py-3 text-left font-medium">Faiz</th>
                  <th className="px-5 py-3 text-left font-medium">Tarix</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => {
                  const pct = Math.round(r.percentage ?? 0)
                  return (
                    <tr key={r.id} className="border-b border-border/50 last:border-0 hover:bg-hover/40 transition">
                      <td className="px-5 py-3 text-text-main">{r.tests?.title ?? '—'}</td>
                      <td className="px-5 py-3 text-text-secondary">{r.tests?.courses?.title ?? '—'}</td>
                      <td className="px-5 py-3 text-text-secondary">{r.score}/{r.total_possible}</td>
                      <td className="px-5 py-3">
                        <span className={pct >= 70 ? 'text-success font-semibold' : pct >= 50 ? 'text-warning font-semibold' : 'text-danger font-semibold'}>
                          {pct}%
                        </span>
                      </td>
                      <td className="px-5 py-3 text-text-secondary">
                        {new Date(r.completed_at).toLocaleDateString('az-AZ')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ),
    },
    {
      key: 'badges',
      label: 'Badge-lər',
      icon: '🎖️',
      content: (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {BADGES_CATALOG.map((b) => {
            const earned = earnedBadges?.has(b.id)
            return (
              <div
                key={b.id}
                className={[
                  'flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition',
                  earned
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-border bg-card opacity-40 grayscale',
                ].join(' ')}
              >
                <span className="text-3xl">{b.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-text-main">{b.label}</p>
                  <p className="mt-0.5 text-xs text-text-secondary">{b.desc}</p>
                </div>
                {!earned && (
                  <span className="text-xs text-text-secondary">🔒 Kilidli</span>
                )}
              </div>
            )
          })}
        </div>
      ),
    },
    {
      key: 'certs',
      label: 'Sertifikatlar',
      icon: '📜',
      content: (
        <EmptyState
          icon="🏆"
          title="Sertifikat yoxdur"
          description="Kursu tamamladıqdan sonra sertifikatınız burada görünəcək."
        />
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Profile header */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <Avatar name={profile?.full_name} size="xl" />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-text-main">
                {profile?.full_name ?? 'İstifadəçi'}
              </h1>
              <Badge variant="primary">
                {roleLabelMap[profile?.role] ?? 'İstifadəçi'}
              </Badge>
            </div>
            <p className="mt-1 text-text-secondary">{user?.email}</p>
            <p className="mt-2 text-sm text-text-secondary">
              📅 Üzv olma:&nbsp;
              {user?.created_at
                ? new Date(user.created_at).toLocaleDateString('az-AZ')
                : '—'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold text-primary">{stats.total * 10}</p>
            <p className="text-sm text-text-secondary">XP balı</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-xl border border-border bg-card p-5">
        <Tabs tabs={tabs} />
      </div>
    </div>
  )
}
