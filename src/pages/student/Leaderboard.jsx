import { useEffect, useState } from 'react'
import { Medal, Trophy } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import Avatar from '../../components/ui/Avatar'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

const MEDAL_COLORS = ['#facc15', '#a1a1aa', '#d97706']

export default function Leaderboard() {
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const { data: results, error } = await supabase
          .from('results')
          .select('user_id, score, percentage')

        if (error) console.error('results fetch error:', error)

        const byUser = {}
        for (const r of results ?? []) {
          if (!byUser[r.user_id]) {
            byUser[r.user_id] = { xp: 0, totalPct: 0, count: 0 }
          }
          byUser[r.user_id].xp += r.score ?? 0
          byUser[r.user_id].totalPct += r.percentage ?? 0
          byUser[r.user_id].count += 1
        }

        const userIds = Object.keys(byUser)
        if (userIds.length === 0) {
          setRows([])
          return
        }

        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, full_name, role')
          .in('id', userIds)
          .eq('role', 'student')

        if (usersError) console.error('users fetch error:', usersError)

        const merged = (users ?? [])
          .map((u) => ({
            id: u.id,
            name: u.full_name ?? 'İstifadəçi',
            xp: byUser[u.id].xp,
            avgPct: Math.round(byUser[u.id].totalPct / byUser[u.id].count),
            tests: byUser[u.id].count,
          }))
          .sort((a, b) => b.xp - a.xp)
          .slice(0, 20)

        setRows(merged)
      } catch (err) {
        console.error('Leaderboard fetch failed:', err)
        setRows([])
      } finally {
        setLoading(false)
      }
    }
    fetchLeaderboard()
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
      <div className="flex items-center gap-2">
        <Trophy size={22} strokeWidth={2} className="text-warning" />
        <div>
          <h1 className="text-2xl font-bold text-text-main">Liderboard</h1>
          <p className="mt-1 text-text-secondary">Ən yüksək XP toplayan tələbələr</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Hələ heç bir nəticə yoxdur"
          description="Test tamamladıqdan sonra liderborda düşəcəksiniz."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-border text-text-secondary">
                <th className="px-5 py-3 text-left font-medium">Sıra</th>
                <th className="px-5 py-3 text-left font-medium">Tələbə</th>
                <th className="px-5 py-3 text-left font-medium">Testlər</th>
                <th className="px-5 py-3 text-left font-medium">Orta faiz</th>
                <th className="px-5 py-3 text-left font-medium">XP</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.id}
                  className={[
                    'border-b border-border/50 last:border-0 transition',
                    r.id === user?.id ? 'bg-primary/10' : 'hover:bg-hover/40',
                  ].join(' ')}
                >
                  <td className="px-5 py-3 font-semibold text-text-main">
                    {i < 3 ? (
                      <Medal size={18} strokeWidth={2} style={{ color: MEDAL_COLORS[i] }} />
                    ) : (
                      `#${i + 1}`
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar name={r.name} size="sm" />
                      <span className="font-medium text-text-main">
                        {r.name}
                        {r.id === user?.id && (
                          <span className="ml-2 text-xs text-primary">(Siz)</span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-text-secondary">{r.tests}</td>
                  <td className="px-5 py-3 text-text-secondary">{r.avgPct}%</td>
                  <td className="px-5 py-3 font-semibold text-primary">{r.xp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
