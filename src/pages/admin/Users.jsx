import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Search, Plus, LockOpen, Users as UsersIcon, Check, X, UserPlus } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Tabs from '../../components/ui/Tabs'

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

// Creates the auth user with plain auth.signUp() — no Edge Function, no
// service role key anywhere near the browser. Runs on an isolated client
// (persistSession/autoRefreshToken off) so it never touches the admin's own
// session; a normal signUp() on the shared client would sign the admin out
// and into the freshly created account.
async function createUser({ email, password, fullName, role }) {
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

  if (signUpError) {
    throw new Error(signUpError.message)
  }

  // Supabase signUp() does not error when the email already belongs to a
  // confirmed account — it silently returns that existing user with an
  // empty identities array instead. Without this check we'd go on to
  // "update" a stranger's profile with the name/role from this form.
  if (!signUpData.user) {
    throw new Error('İstifadəçi yaradılmadı.')
  }
  if (signUpData.user.identities && signUpData.user.identities.length === 0) {
    throw new Error('Bu e-poçt artıq istifadə olunur.')
  }

  const newUserId = signUpData.user.id
  // Admin-created accounts skip the approval queue — the admin is
  // vouching for them by creating the account directly.
  const payload = { full_name: fullName, role, is_active: true, approval_status: 'approved' }

  // A DB trigger normally mirrors auth.users → public.users on signup, but
  // it can land a beat after this call returns — retry the update briefly
  // before giving up.
  let profile = null
  for (let attempt = 0; attempt < 5 && !profile; attempt++) {
    if (attempt > 0) await sleep(400)
    const { data } = await supabase
      .from('users')
      .update(payload)
      .eq('id', newUserId)
      .select()
      .maybeSingle()
    profile = data
  }

  if (!profile) {
    // No trigger created the row — insert it directly instead.
    const { data: inserted, error: insertError } = await supabase
      .from('users')
      .insert({ id: newUserId, email, ...payload })
      .select()
      .maybeSingle()
    if (insertError) {
      throw new Error(
        `Hesab yaradıldı, amma profil sətri saxlanmadı: ${insertError.message}`
      )
    }
    profile = inserted
  }

  return profile ?? { id: newUserId, email, ...payload }
}

// Calls the delete-user Edge Function — the only path that removes a user
// (and every dependent row: results, answers, certificates, enrollments,
// enrollment_requests, group_members, lesson_completions) and their
// auth.users record. Requires the delete-user function to be deployed.
//
// Uses a raw fetch instead of supabase.functions.invoke() so a failed
// deletion can never be mistaken for a successful one: invoke() only
// rejects on a non-2xx status, so a function that returns 200 without
// actually deleting anything (e.g. it silently swallowed an error) would
// look like a success and the row would vanish from the UI only to come
// back on reload. Checking response.ok AND data.success closes that gap.
async function deleteUserPermanently(userId) {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('Sessiya tapılmadı. Yenidən giriş edin.')
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

  const response = await fetch(`${supabaseUrl}/functions/v1/delete-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ user_id: userId }),
  })

  let data
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok || !data?.success) {
    console.error('Silmə xətası:', { status: response.status, data })
    throw new Error(
      data?.error || 'Silmə əməliyyatı uğursuz oldu. Edge Function deploy edilibmi yoxlayın.'
    )
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

  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectNote, setRejectNote] = useState('')
  const [rejecting, setRejecting] = useState(false)

  const [groupTarget, setGroupTarget] = useState(null)
  const [groupCourses, setGroupCourses] = useState([])
  const [groupCourseId, setGroupCourseId] = useState('')
  const [groupOptions, setGroupOptions] = useState([])
  const [groupId, setGroupId] = useState('')
  const [groupSaving, setGroupSaving] = useState(false)
  const [groupError, setGroupError] = useState('')

  async function fetchUsers() {
    setLoading(true)
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) console.error('users fetch error:', error)
    setUsers(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const pendingUsers = useMemo(
    () => users.filter((u) => u.approval_status === 'pending'),
    [users]
  )

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
    const { error } = await supabase.from('users').update({ role: newRole }).eq('id', userId)
    if (error) {
      showBanner('error', 'Rol dəyişdirilmədi. Yenidən cəhd edin.')
    } else {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)))
    }
    setBusyId(null)
  }

  async function handleReactivate(u) {
    setBusyId(u.id)
    const { error } = await supabase.from('users').update({ is_active: true }).eq('id', u.id)
    if (error) {
      showBanner('error', 'Aktivləşdirilmədi. Yenidən cəhd edin.')
    } else {
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_active: true } : x)))
      showBanner('success', 'İstifadəçi aktivləşdirildi.')
    }
    setBusyId(null)
  }

  async function handleDeactivateToggle(u) {
    setBusyId(u.id)
    const { error } = await supabase.from('users').update({ is_active: false }).eq('id', u.id)
    if (error) {
      showBanner('error', 'Deaktiv edilmədi. Yenidən cəhd edin.')
    } else {
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_active: false } : x)))
      showBanner('success', 'İstifadəçi deaktiv edildi.')
    }
    setBusyId(null)
  }

  async function handleApprove(u) {
    setBusyId(u.id)
    const { error } = await supabase
      .from('users')
      .update({ approval_status: 'approved' })
      .eq('id', u.id)
    if (error) {
      showBanner('error', 'Təsdiqlənmədi. Yenidən cəhd edin.')
    } else {
      setUsers((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, approval_status: 'approved' } : x))
      )
      showBanner('success', 'İstifadəçi təsdiqləndi.')
    }
    setBusyId(null)
  }

  async function handleReject(e) {
    e.preventDefault()
    if (!rejectTarget) return
    setRejecting(true)
    const { error } = await supabase
      .from('users')
      .update({ approval_status: 'rejected', admin_note: rejectNote || null })
      .eq('id', rejectTarget.id)
    setRejecting(false)
    if (error) {
      showBanner('error', 'Rədd edilmədi. Yenidən cəhd edin.')
      return
    }
    setUsers((prev) =>
      prev.map((x) =>
        x.id === rejectTarget.id
          ? { ...x, approval_status: 'rejected', admin_note: rejectNote || null }
          : x
      )
    )
    setRejectTarget(null)
    setRejectNote('')
    showBanner('success', 'Müraciət rədd edildi.')
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
      const created = await createUser({
        email: form.email.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
        role: form.role,
      })
      setUsers((prev) => [{ created_at: new Date().toISOString(), ...created }, ...prev])
      setShowCreateModal(false)
      showBanner('success', 'İstifadəçi yaradıldı və avtomatik təsdiqləndi.')
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
      await deleteUserPermanently(deleteTarget.id)
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id))
      setDeleteTarget(null)
      showBanner('success', 'İstifadəçi və bütün məlumatları silindi.')
    } catch (err) {
      showBanner('error', err.message)
    } finally {
      setDeleting(false)
    }
  }

  async function openGroupModal(u) {
    setGroupTarget(u)
    setGroupError('')
    setGroupCourseId('')
    setGroupId('')
    setGroupOptions([])
    const { data } = await supabase.from('courses').select('id, title').order('title')
    setGroupCourses(data ?? [])
  }

  useEffect(() => {
    if (!groupCourseId) {
      setGroupOptions([])
      return
    }
    supabase
      .from('groups')
      .select('id, name')
      .eq('course_id', groupCourseId)
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => setGroupOptions(data ?? []))
  }, [groupCourseId])

  async function handleAddToGroup(e) {
    e.preventDefault()
    if (!groupTarget || !groupId) {
      setGroupError('Kurs və qrup seçin.')
      return
    }
    setGroupSaving(true)
    setGroupError('')

    const { data: existing } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', groupTarget.id)
      .maybeSingle()

    if (existing) {
      setGroupSaving(false)
      setGroupError('İstifadəçi artıq bu qrupdadır.')
      return
    }

    const { error } = await supabase
      .from('group_members')
      .insert({ group_id: groupId, user_id: groupTarget.id })
    setGroupSaving(false)
    if (error) {
      setGroupError('Əlavə edilmədi. Yenidən cəhd edin.')
      return
    }
    setGroupTarget(null)
    showBanner('success', `${groupTarget.full_name ?? groupTarget.email} qrupa əlavə edildi.`)
  }

  const tabs = [
    {
      key: 'all',
      label: 'Hamısı',
      icon: UsersIcon,
      content: (
        <UsersTable
          users={filteredUsers}
          currentUser={currentUser}
          busyId={busyId}
          onRoleChange={handleRoleChange}
          onReactivate={handleReactivate}
          onDeactivate={handleDeactivateToggle}
          onDelete={setDeleteTarget}
          onAddGroup={openGroupModal}
          search={search}
        />
      ),
    },
    {
      key: 'pending',
      label: 'Gözləyənlər',
      icon: UserPlus,
      badge: pendingUsers.length,
      content:
        pendingUsers.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title="Gözləyən müraciət yoxdur"
            description="Yeni qeydiyyatlar burada görünəcək."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {pendingUsers.map((u) => (
              <div
                key={u.id}
                className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={u.full_name ?? u.email} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-text-main">{u.full_name ?? '—'}</p>
                    <p className="truncate text-xs text-text-secondary">{u.email}</p>
                    <p className="text-xs text-text-muted">
                      {new Date(u.created_at).toLocaleDateString('az-AZ')}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="success"
                    size="sm"
                    disabled={busyId === u.id}
                    onClick={() => handleApprove(u)}
                  >
                    <Check size={14} strokeWidth={2} /> Təsdiq et
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={busyId === u.id}
                    onClick={() => {
                      setRejectTarget(u)
                      setRejectNote('')
                    }}
                  >
                    <X size={14} strokeWidth={2} /> Rədd et
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-main">İstifadəçilər</h1>
          <p className="mt-1 text-text-secondary">Platformadakı bütün istifadəçilər</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative sm:w-64">
            <Search
              size={16}
              strokeWidth={2}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ad və ya e-poçt üzrə axtar..."
              className="w-full rounded-lg border border-border bg-input py-2.5 pl-9 pr-3 text-sm text-text-main outline-none transition focus:border-primary"
            />
          </div>
          <Button onClick={openCreateModal}>
            <Plus size={16} strokeWidth={2} /> Yeni istifadəçi
          </Button>
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
      ) : (
        <div className="rounded-xl border border-border bg-card p-5">
          <Tabs tabs={tabs} />
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
              className="rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-text-main outline-none focus:border-primary"
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

      {/* Permanent delete confirmation modal */}
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
              {deleting ? 'Silinir...' : 'Bəli, tamamilə sil'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-secondary">
          <strong className="text-text-main">{deleteTarget?.full_name ?? deleteTarget?.email}</strong>{' '}
          silinəcək.
        </p>
        <p className="mt-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          Bu əməliyyat geri qaytarıla bilməz. İstifadəçinin bütün məlumatları, nəticələri və
          sertifikatları silinəcək.
        </p>
      </Modal>

      {/* Reject with note modal */}
      <Modal
        open={!!rejectTarget}
        onClose={() => !rejecting && setRejectTarget(null)}
        title="Müraciəti rədd et"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectTarget(null)} disabled={rejecting}>
              Ləğv et
            </Button>
            <Button variant="danger" onClick={handleReject} disabled={rejecting}>
              {rejecting ? 'Göndərilir...' : 'Rədd et'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleReject} className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">
            <strong className="text-text-main">
              {rejectTarget?.full_name ?? rejectTarget?.email}
            </strong>{' '}
            — rədd səbəbini yazın (istəyə bağlı).
          </p>
          <textarea
            rows={3}
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="Rədd səbəbi..."
            className="resize-none rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-text-main outline-none focus:border-primary"
          />
        </form>
      </Modal>

      {/* Add to group modal */}
      <Modal
        open={!!groupTarget}
        onClose={() => !groupSaving && setGroupTarget(null)}
        title="Qrupa əlavə et"
        footer={
          <>
            <Button variant="secondary" onClick={() => setGroupTarget(null)} disabled={groupSaving}>
              Ləğv et
            </Button>
            <Button onClick={handleAddToGroup} disabled={groupSaving || !groupId}>
              {groupSaving ? 'Əlavə edilir...' : 'Əlavə et'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddToGroup} className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">
            <strong className="text-text-main">
              {groupTarget?.full_name ?? groupTarget?.email}
            </strong>{' '}
            üçün kurs və qrup seçin.
          </p>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-text-secondary">Kurs</label>
            <select
              value={groupCourseId}
              onChange={(e) => {
                setGroupCourseId(e.target.value)
                setGroupId('')
              }}
              className="rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-text-main outline-none focus:border-primary"
            >
              <option value="">Kurs seçin</option>
              {groupCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-text-secondary">Qrup</label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              disabled={!groupCourseId}
              className="rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-text-main outline-none focus:border-primary disabled:opacity-50"
            >
              <option value="">
                {groupCourseId ? 'Qrup seçin' : 'Əvvəlcə kurs seçin'}
              </option>
              {groupOptions.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            {groupCourseId && groupOptions.length === 0 && (
              <p className="text-xs text-text-muted">Bu kursda aktiv qrup yoxdur.</p>
            )}
          </div>
          {groupError && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {groupError}
            </div>
          )}
        </form>
      </Modal>
    </div>
  )
}

function UsersTable({
  users,
  currentUser,
  busyId,
  onRoleChange,
  onReactivate,
  onDeactivate,
  onDelete,
  onAddGroup,
  search,
}) {
  if (users.length === 0) {
    return (
      <EmptyState
        icon={UsersIcon}
        title={search ? 'Heç bir istifadəçi tapılmadı' : 'Hələ heç bir istifadəçi yoxdur'}
        description={search ? 'Başqa açar sözlə axtarmağı sınayın.' : 'İlk istifadəçini yaradın.'}
      />
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead>
          <tr className="border-b border-border text-text-secondary">
            <th className="px-4 py-3 font-medium">İstifadəçi</th>
            <th className="px-4 py-3 font-medium">Qeydiyyat tarixi</th>
            <th className="px-4 py-3 font-medium">Rol</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Təsdiq</th>
            <th className="px-4 py-3 font-medium">Əməliyyat</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
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
                    onChange={(e) => onRoleChange(u.id, e.target.value)}
                    disabled={isBusy || isSelf}
                    className="rounded-lg border border-border bg-input px-2.5 py-1.5 text-sm text-text-main outline-none focus:border-primary disabled:opacity-50"
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
                  <Badge
                    variant={
                      u.approval_status === 'pending'
                        ? 'warning'
                        : u.approval_status === 'rejected'
                          ? 'danger'
                          : 'success'
                    }
                  >
                    {u.approval_status === 'pending'
                      ? 'Gözləyir'
                      : u.approval_status === 'rejected'
                        ? 'Rədd edilib'
                        : 'Təsdiqlənib'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {u.role === 'student' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={isBusy}
                        onClick={() => onAddGroup(u)}
                        title="Qrupa əlavə et"
                      >
                        <UserPlus size={13} strokeWidth={2} />
                      </Button>
                    )}
                    {u.is_active === false ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={isBusy || isSelf}
                        onClick={() => onReactivate(u)}
                      >
                        {isBusy ? '...' : <><LockOpen size={13} strokeWidth={2} /> Aktivləşdir</>}
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={isBusy || isSelf}
                        onClick={() => onDeactivate(u)}
                      >
                        Deaktiv et
                      </Button>
                    )}
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={isBusy || isSelf}
                      onClick={() => onDelete(u)}
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
  )
}
