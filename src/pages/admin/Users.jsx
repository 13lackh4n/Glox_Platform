import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

const ROLES = ['student', 'instructor', 'super_admin']
const ROLE_LABELS = {
  student: 'Tələbə',
  instructor: 'Təlimçi',
  super_admin: 'Super Admin',
}

export default function AdminUsers() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [updatingId, setUpdatingId] = useState(null)

  async function fetchUsers() {
    setLoading(true)
    const { data } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
    setUsers(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return users
    return users.filter(
      (u) =>
        (u.full_name ?? '').toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query)
    )
  }, [users, search])

  async function handleRoleChange(userId, newRole) {
    setUpdatingId(userId)
    await supabase.from('users').update({ role: newRole }).eq('id', userId)
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)))
    setUpdatingId(null)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-main sm:text-3xl">İstifadəçilər</h1>
          <p className="mt-1 text-text-secondary">Platformadakı bütün istifadəçilər</p>
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
            placeholder="Ad və ya e-poçt üzrə axtar..."
            className="w-full rounded-lg border border-white/10 bg-card py-2.5 pl-9 pr-3 text-sm text-text-main outline-none transition focus:border-primary"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-text-secondary">Yüklənir...</p>
      ) : filteredUsers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-card px-6 py-16 text-center text-text-secondary">
          {search ? 'Heç bir istifadəçi tapılmadı.' : 'Hələ heç bir istifadəçi yoxdur.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-card">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-text-secondary">
                <th className="px-4 py-3 font-medium">Ad</th>
                <th className="px-4 py-3 font-medium">E-poçt</th>
                <th className="px-4 py-3 font-medium">Qeydiyyat tarixi</th>
                <th className="px-4 py-3 font-medium">Rol</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 text-text-main">{u.full_name ?? '—'}</td>
                  <td className="px-4 py-3 text-text-secondary">{u.email}</td>
                  <td className="px-4 py-3 text-text-secondary">
                    {new Date(u.created_at).toLocaleDateString('az-AZ')}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      disabled={updatingId === u.id || u.id === currentUser?.id}
                      className="rounded-lg border border-white/10 bg-bg px-2.5 py-1.5 text-sm text-text-main outline-none focus:border-primary disabled:opacity-50"
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
