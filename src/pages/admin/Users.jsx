import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

const ROLES = ['student', 'instructor', 'super_admin']
const ROLE_LABELS = {
  student: 'Tələbə',
  instructor: 'Təlimçi',
  super_admin: 'Super Admin',
}
const EMPTY_FORM = { fullName: '', email: '', password: '', role: 'student' }

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Creates the auth user without the manage-users Edge Function — plain
// signUp() on an isolated client so it never touches the admin's own
// session (a normal supabase.auth.signUp() on the shared client would sign
// the admin out and into the new account). The isolated client never
// persists to storage, so nothing needs cleaning up afterwards.
async function createUserWithoutEdgeFunction({ email, password, fullName, role }) {
  const isolatedClient = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  const { data: signUpData, error: signUpError } = await isolatedClient.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  })

  if (signUpError || !signUpData.user) {
    throw new Error(signUpError?.message ?? 'İstifadəçi yaradılmadı.')
  }

  const newUserId = signUpData.user.id

  // A DB trigger normally mirrors auth.users → public.users on signup, but
  // it can land a beat after this call returns — retry the update briefly,
  // then fall back to an insert in case no such trigger exists.
  let updated = null
  for (let attempt = 0; attempt < 5 && !updated; attempt++) {
    if (attempt > 0) await sleep(400)
    const { data } = await supabase
      .from('users')
      .update({ full_name: fullName, role, is_active: true })
      .eq('id', newUserId)
      .select()
      .maybeSingle()
    updated = data
  }

  if (!updated) {
    const { data: inserted, error: insertError } = await supabase
      .from('users')
      .upsert({ id: newUserId, email, full_name: fullName, role, is_active: true }, { onConflict: 'id' })
      .select()
      .maybeSingle()
    if (insertError) throw new Error(insertError.message)
    updated = inserted
  }

  return updated ?? { id: newUserId, email, full_name: fullName, role, is_active: true }
}

async function callManageUsers(body) {
  const { data, error } = await supabase.functions.invoke('manage-users', { body })
  if (error) {
    let message = 'Əməliyyat uğursuz oldu. Yenidən cəhd edin.'
    try {
      const errBody = await error.context?.json?.()
      if (errBody?.error) message = errBody.error
    } catch {
      // response body wasn't JSON — fall back to the generic message
    }
    throw new Error(message)
  }
  return data
}

export default function AdminUsers() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [banner, setBanner] = useState(null)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [creating, setCreating] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

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

  function showBanner(type, message) {
    setBanner({ type, message })
    setTimeout(() => setBanner(null), 4000)
  }

  async function handleRoleChange(userId, newRole) {
    setBusyId(userId)
    try {
      await callManageUsers({ action: 'updateRole', userId, role: newRole })
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)))
    } catch (err) {
      showBanner('error', err.message)
    } finally {
      setBusyId(null)
    }
  }

  async function handleToggleActive(u) {
    setBusyId(u.id)
    const nextActive = !u.is_active
    try {
      await callManageUsers({ action: 'setActive', userId: u.id, isActive: nextActive })
      setUsers((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, is_active: nextActive } : x))
      )
    } catch (err) {
      showBanner('error', err.message)
    } finally {
      setBusyId(null)
    }
  }

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function openCreateModal() {
    setForm(EMPTY_FORM)
    setFormError('')
    setShowCreateModal(true)
  }

  async function handleCreate(e) {
    e.preventDefault()
    setFormError('')

    if (!form.fullName.trim() || !form.email.trim() || !form.password) {
      setFormError('Bütün sahələri doldurun.')
      return
    }
    if (form.password.length < 6) {
      setFormError('Şifrə ən azı 6 simvol olmalıdır.')
      return
    }

    setCreating(true)
    try {
      const created = await createUserWithoutEdgeFunction({
        email: form.email.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
        role: form.role,
      })
      setUsers((prev) => [
        { created_at: new Date().toISOString(), ...created },
        ...prev,
      ])
      setShowCreateModal(false)
      showBanner(
        'success',
        'İstifadəçi yaradıldı. Layihədə email təsdiqi aktivdirsə, istifadəçi giriş etməzdən əvvəl e-poçtunu təsdiqləməlidir.'
      )
    } catch (err) {
      setFormError(err.message)
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await callManageUsers({ action: 'delete', userId: deleteTarget.id })
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id))
      setDeleteTarget(null)
      showBanner('success', 'İstifadəçi silindi.')
    } catch (err) {
      showBanner('error', err.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-main">İstifadəçilər</h1>
          <p className="mt-1 text-text-secondary">Platformadakı bütün istifadəçilər</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative sm:w-64">
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
              className="w-full rounded-lg border border-border bg-card py-2.5 pl-9 pr-3 text-sm text-text-main outline-none transition focus:border-primary"
            />
          </div>
          <Button onClick={openCreateModal}>+ Yeni istifadəçi</Button>
        </div>
      </div>

      {banner && (
        <div
          className={[
            'rounded-lg border px-4 py-3 text-sm',
            banner.type === 'success'
              ? 'border-success/30 bg-success/10 text-success'
              : 'border-danger/30 bg-danger/10 text-danger',
          ].join(' ')}
        >
          {banner.message}
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          icon="👥"
          title={search ? 'Heç bir istifadəçi tapılmadı' : 'Hələ heç bir istifadəçi yoxdur'}
          description={search ? 'Başqa açar sözlə axtarmağı sınayın.' : 'İlk istifadəçini yaradın.'}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-text-secondary">
                <th className="px-4 py-3 font-medium">İstifadəçi</th>
                <th className="px-4 py-3 font-medium">Qeydiyyat tarixi</th>
                <th className="px-4 py-3 font-medium">Rol</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => {
                const isSelf = u.id === currentUser?.id
                const isBusy = busyId === u.id
                return (
                  <tr key={u.id} className="border-b border-border/50 last:border-0 hover:bg-hover/30 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.full_name ?? u.email} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-text-main">
                            {u.full_name ?? '—'}
                            {isSelf && <span className="ml-2 text-xs text-primary">(Siz)</span>}
                          </p>
                          <p className="truncate text-xs text-text-secondary">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {new Date(u.created_at).toLocaleDateString('az-AZ')}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        disabled={isBusy || isSelf}
                        className="rounded-lg border border-border bg-bg px-2.5 py-1.5 text-sm text-text-main outline-none focus:border-primary disabled:opacity-50"
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={u.is_active === false ? 'danger' : 'success'}>
                        {u.is_active === false ? 'Deaktiv' : 'Aktiv'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={isBusy || isSelf}
                          onClick={() => handleToggleActive(u)}
                        >
                          {isBusy
                            ? '...'
                            : u.is_active === false
                              ? '🔓 Aktiv et'
                              : '🔒 Deaktiv et'}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={isBusy || isSelf}
                          onClick={() => setDeleteTarget(u)}
                        >
                          Sil
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create user modal */}
      <Modal
        open={showCreateModal}
        onClose={() => !creating && setShowCreateModal(false)}
        title="Yeni istifadəçi yarat"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)} disabled={creating}>
              Ləğv et
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? 'Yaradılır...' : 'Yarat'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input
            label="Ad Soyad"
            value={form.fullName}
            onChange={(e) => update('fullName', e.target.value)}
            placeholder="Ad Soyad"
          />
          <Input
            label="E-poçt"
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            placeholder="siz@nümunə.az"
          />
          <Input
            label="Şifrə"
            type="password"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            placeholder="Ən azı 6 simvol"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-main">Rol</label>
            <select
              value={form.role}
              onChange={(e) => update('role', e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-text-main outline-none focus:border-primary"
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </div>
          {formError && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {formError}
            </div>
          )}
        </form>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        title="İstifadəçini sil"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Ləğv et
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Silinir...' : 'Bəli, sil'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-secondary">
          <strong className="text-text-main">{deleteTarget?.full_name ?? deleteTarget?.email}</strong>{' '}
          istifadəçisini silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarıla bilməz.
        </p>
      </Modal>
    </div>
  )
}
