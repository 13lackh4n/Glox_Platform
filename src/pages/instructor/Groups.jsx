import { useEffect, useMemo, useState } from 'react'
import { UsersRound, Plus, Search, UserPlus, X, Mail, Calendar } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

const EMPTY_FORM = { name: '', description: '', max_students: '20' }

export default function InstructorGroups() {
  const { user } = useAuth()
  const [courses, setCourses] = useState([])
  const [courseId, setCourseId] = useState('')
  const [groups, setGroups] = useState([])
  const [membersByGroup, setMembersByGroup] = useState({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [membersGroup, setMembersGroup] = useState(null)
  const [eligibleStudents, setEligibleStudents] = useState([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [studentSearch, setStudentSearch] = useState('')
  const [addingId, setAddingId] = useState(null)

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
    await fetchGroups()
    if (membersGroup) {
      fetchEligibleStudents(membersGroup)
    }
  }

  async function fetchEligibleStudents(group) {
    setStudentsLoading(true)

    const { data: enrollmentsData } = await supabase
      .from('enrollments')
      .select('user_id')
      .eq('course_id', group.course_id)

    const enrolledIds = [...new Set((enrollmentsData ?? []).map((e) => e.user_id))]

    if (enrolledIds.length === 0) {
      setEligibleStudents([])
      setStudentsLoading(false)
      return
    }

    const { data: usersData } = await supabase
      .from('users')
      .select('id, full_name, email, approval_status, role')
      .in('id', enrolledIds)
      .eq('role', 'student')
      .eq('approval_status', 'approved')

    const currentMemberIds = new Set(
      (membersByGroup[group.id] ?? []).map((m) => m.user_id)
    )

    setEligibleStudents(
      (usersData ?? []).filter((u) => !currentMemberIds.has(u.id))
    )
    setStudentsLoading(false)
  }

  function openMembersModal(group) {
    setMembersGroup(group)
    setStudentSearch('')
    fetchEligibleStudents(group)
  }

  function closeMembersModal() {
    setMembersGroup(null)
    setEligibleStudents([])
    setStudentSearch('')
  }

  async function addMember(student) {
    if (!membersGroup) return
    setAddingId(student.id)
    const { error: insertError } = await supabase.from('group_members').insert({
      group_id: membersGroup.id,
      user_id: student.id,
    })
    setAddingId(null)
    if (insertError) return
    setEligibleStudents((prev) => prev.filter((s) => s.id !== student.id))
    fetchGroups()
  }

  const filteredEligible = useMemo(() => {
    const q = studentSearch.trim().toLowerCase()
    if (!q) return eligibleStudents
    return eligibleStudents.filter(
      (s) =>
        s.full_name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)
    )
  }, [eligibleStudents, studentSearch])

  const currentMembers = membersGroup ? membersByGroup[membersGroup.id] ?? [] : []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Qrup İdarəetməsi</h1>
          <p className="mt-1 text-text-secondary">Kurslarınız üzrə qruplar</p>
        </div>
        <Button
          onClick={() => {
            setForm(EMPTY_FORM)
            setError('')
            setShowModal(true)
          }}
          disabled={!courseId}
        >
          <Plus size={16} strokeWidth={2} /> Yeni qrup
        </Button>
      </div>

      {courses.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="Kurs tapılmadı"
          description="Qrup yaratmaq üçün əvvəlcə öz kursunuz olmalıdır."
        />
      ) : (
        <>
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="w-full max-w-xs rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-text-main outline-none focus:border-primary"
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>

          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Spinner size="lg" />
            </div>
          ) : groups.length === 0 ? (
            <EmptyState
              icon={UsersRound}
              title="Qrup yoxdur"
              description="Bu kurs üçün hələ qrup yaradılmayıb."
            />
          ) : (
            <div className="flex flex-col gap-4">
              {groups.map((g) => {
                const members = membersByGroup[g.id] ?? []
                return (
                  <div key={g.id} className="rounded-xl border border-border bg-card p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-text-main">{g.name}</h3>
                          <Badge variant={g.is_active ? 'success' : 'default'}>
                            {g.is_active ? 'Aktiv' : 'Deaktiv'}
                          </Badge>
                        </div>
                        {g.description && (
                          <p className="mt-1 text-sm text-text-secondary">{g.description}</p>
                        )}
                        <p className="mt-1 text-xs text-text-secondary">
                          {members.length}/{g.max_students} tələbə
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={() => openMembersModal(g)}>
                          <UsersRound size={14} strokeWidth={2} /> Tələbələr ({members.length})
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={busyId === g.id}
                          onClick={() => toggleActive(g)}
                        >
                          {g.is_active ? 'Deaktiv et' : 'Aktivləşdir'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Yeni qrup yarat"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Ləğv et
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? 'Yaradılır...' : 'Yarat'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input
            label="Ad"
            required
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Məs: Qrup A"
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-main">Təsvir</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              className="resize-none rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-text-main outline-none transition focus:border-primary"
            />
          </div>

          <Input
            label="Maksimum tələbə sayı"
            type="number"
            min={1}
            value={form.max_students}
            onChange={(e) => update('max_students', e.target.value)}
          />

          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}
        </form>
      </Modal>

      <Modal
        open={!!membersGroup}
        onClose={closeMembersModal}
        title={membersGroup ? `Tələbələr — ${membersGroup.name}` : ''}
      >
        <div className="flex flex-col gap-6">
          <div>
            <h3 className="mb-3 text-sm font-semibold text-text-main">
              Qrup üzvləri ({currentMembers.length})
            </h3>
            {currentMembers.length === 0 ? (
              <p className="text-sm text-text-secondary">Bu qrupda hələ üzv yoxdur.</p>
            ) : (
              <div className="flex max-h-56 flex-col gap-2 overflow-y-auto pr-1">
                {currentMembers.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-bg px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={m.user?.full_name} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-text-main">
                          {m.user?.full_name ?? '—'}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-secondary">
                          <span className="flex items-center gap-1 truncate">
                            <Mail size={11} strokeWidth={2} /> {m.user?.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar size={11} strokeWidth={2} />{' '}
                            {new Date(m.joined_at).toLocaleDateString('az-AZ')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeMember(m.id)}
                      disabled={busyId === m.id}
                      className="flex shrink-0 items-center gap-1 rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-medium text-danger transition hover:bg-danger/10 disabled:opacity-50"
                    >
                      <X size={12} strokeWidth={2} /> Çıxar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-border pt-5">
            <h3 className="mb-3 text-sm font-semibold text-text-main">Tələbə əlavə et</h3>
            <Input
              icon={<Search size={16} strokeWidth={2} />}
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder="Ad və ya e-poçt üzrə axtar..."
            />

            <div className="mt-3 flex max-h-56 flex-col gap-2 overflow-y-auto pr-1">
              {studentsLoading ? (
                <div className="flex justify-center py-6">
                  <Spinner />
                </div>
              ) : filteredEligible.length === 0 ? (
                <p className="py-3 text-center text-sm text-text-secondary">
                  Əlavə etmək üçün uyğun tələbə tapılmadı.
                </p>
              ) : (
                filteredEligible.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={s.full_name} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-text-main">
                          {s.full_name ?? '—'}
                        </p>
                        <p className="truncate text-xs text-text-secondary">{s.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => addMember(s)}
                      disabled={addingId === s.id}
                      className="flex shrink-0 items-center gap-1 rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/10 disabled:opacity-50"
                    >
                      <UserPlus size={12} strokeWidth={2} /> Əlavə et
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
