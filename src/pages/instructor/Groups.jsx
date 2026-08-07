import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

const EMPTY_FORM = { name: '', description: '', max_students: '20' }

export default function InstructorGroups() {
  const { user } = useAuth()
  const [courses, setCourses] = useState([])
  const [courseId, setCourseId] = useState('')
  const [groups, setGroups] = useState([])
  const [membersByGroup, setMembersByGroup] = useState({})
  const [expandedGroup, setExpandedGroup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function fetchCourses() {
    if (!user) return
    const { data } = await supabase
      .from('courses')
      .select('id, title')
      .eq('instructor_id', user.id)
      .order('title', { ascending: true })
    setCourses(data ?? [])
    if (data && data.length > 0 && !courseId) {
      setCourseId(data[0].id)
    } else {
      setLoading(false)
    }
  }

  async function fetchGroups() {
    if (!courseId) {
      setGroups([])
      setLoading(false)
      return
    }
    setLoading(true)

    const { data: groupsData } = await supabase
      .from('groups')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false })
    setGroups(groupsData ?? [])

    const groupIds = (groupsData ?? []).map((g) => g.id)
    if (groupIds.length > 0) {
      const { data: membersData } = await supabase
        .from('group_members')
        .select('id, group_id, user_id, joined_at')
        .in('group_id', groupIds)

      const userIds = [...new Set((membersData ?? []).map((m) => m.user_id))]
      let usersById = {}
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, full_name, email')
          .in('id', userIds)
        usersById = Object.fromEntries((usersData ?? []).map((u) => [u.id, u]))
      }

      const grouped = {}
      ;(membersData ?? []).forEach((m) => {
        grouped[m.group_id] = [
          ...(grouped[m.group_id] ?? []),
          { ...m, user: usersById[m.user_id] },
        ]
      })
      setMembersByGroup(grouped)
    } else {
      setMembersByGroup({})
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchCourses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    fetchGroups()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId])

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleCreate(e) {
    e.preventDefault()
    setError('')
    if (!form.name) {
      setError('Qrup adı tələb olunur.')
      return
    }
    setSaving(true)
    const { error: insertError } = await supabase.from('groups').insert({
      course_id: courseId,
      name: form.name,
      description: form.description || null,
      max_students: Number(form.max_students),
      is_active: true,
    })
    setSaving(false)
    if (insertError) {
      setError('Qrup yaradılmadı. Yenidən cəhd edin.')
      return
    }
    setForm(EMPTY_FORM)
    setShowModal(false)
    fetchGroups()
  }

  async function toggleActive(group) {
    setBusyId(group.id)
    await supabase.from('groups').update({ is_active: !group.is_active }).eq('id', group.id)
    setBusyId(null)
    fetchGroups()
  }

  async function removeMember(memberId) {
    if (!window.confirm('Tələbəni qrupdan çıxarmaq istədiyinizə əminsiniz?')) return
    setBusyId(memberId)
    await supabase.from('group_members').delete().eq('id', memberId)
    setBusyId(null)
    fetchGroups()
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-main sm:text-3xl">Qrup İdarəetməsi</h1>
          <p className="mt-1 text-text-secondary">Kurslarınız üzrə qruplar</p>
        </div>
        <button
          onClick={() => {
            setForm(EMPTY_FORM)
            setError('')
            setShowModal(true)
          }}
          disabled={!courseId}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          + Yeni qrup
        </button>
      </div>

      {courses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center text-text-secondary">
          Qrup yaratmaq üçün əvvəlcə öz kursunuz olmalıdır.
        </div>
      ) : (
        <>
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="mb-6 rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-text-main outline-none focus:border-primary"
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>

          {loading ? (
            <p className="text-text-secondary">Yüklənir...</p>
          ) : groups.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center text-text-secondary">
              Bu kurs üçün hələ qrup yaradılmayıb.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {groups.map((g) => {
                const members = membersByGroup[g.id] ?? []
                const isExpanded = expandedGroup === g.id
                return (
                  <div key={g.id} className="rounded-xl border border-border bg-card p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-text-main">{g.name}</h3>
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-medium ${
                              g.is_active
                                ? 'bg-success/15 text-success'
                                : 'bg-hover text-text-secondary'
                            }`}
                          >
                            {g.is_active ? 'Aktiv' : 'Deaktiv'}
                          </span>
                        </div>
                        {g.description && (
                          <p className="mt-1 text-sm text-text-secondary">{g.description}</p>
                        )}
                        <p className="mt-1 text-xs text-text-secondary">
                          {members.length}/{g.max_students} tələbə
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => setExpandedGroup(isExpanded ? null : g.id)}
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-main transition hover:bg-hover"
                        >
                          {isExpanded ? 'Gizlət' : 'Üzvlər'}
                        </button>
                        <button
                          onClick={() => toggleActive(g)}
                          disabled={busyId === g.id}
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-main transition hover:bg-hover disabled:opacity-50"
                        >
                          {g.is_active ? 'Deaktiv et' : 'Aktivləşdir'}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 border-t border-border pt-4">
                        {members.length === 0 ? (
                          <p className="text-sm text-text-secondary">Bu qrupda hələ üzv yoxdur.</p>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {members.map((m) => (
                              <div
                                key={m.id}
                                className="flex items-center justify-between gap-3 rounded-lg bg-bg px-3 py-2"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm text-text-main">
                                    {m.user?.full_name ?? '—'}
                                  </p>
                                  <p className="truncate text-xs text-text-secondary">
                                    {m.user?.email}
                                  </p>
                                </div>
                                <button
                                  onClick={() => removeMember(m.id)}
                                  disabled={busyId === m.id}
                                  className="shrink-0 rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-medium text-danger transition hover:bg-danger/10 disabled:opacity-50"
                                >
                                  Çıxar
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-bold text-text-main">Yeni qrup yarat</h2>

            <form onSubmit={handleCreate} className="mt-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-text-secondary">Ad</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder="Məs: Qrup A"
                  className="rounded-lg border border-border bg-input px-3 py-2.5 text-text-main outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-text-secondary">Təsvir</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  className="resize-none rounded-lg border border-border bg-input px-3 py-2.5 text-text-main outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-text-secondary">Maksimum tələbə sayı</label>
                <input
                  type="number"
                  min={1}
                  value={form.max_students}
                  onChange={(e) => update('max_students', e.target.value)}
                  className="rounded-lg border border-border bg-input px-3 py-2.5 text-text-main outline-none focus:border-primary"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                  {error}
                </div>
              )}

              <div className="mt-1 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-main transition hover:bg-hover"
                >
                  Ləğv et
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? 'Yaradılır...' : 'Yarat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
