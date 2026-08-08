import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Lock, LockOpen, UsersRound, ArrowUp, ArrowDown } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

const EMPTY_FORM = { title: '', description: '', group_id: '', order_num: '0' }

export default function InstructorLessons() {
  const { user } = useAuth()
  const [courses, setCourses] = useState([])
  const [courseId, setCourseId] = useState('')
  const [groups, setGroups] = useState([])
  const [lessons, setLessons] = useState([])
  const [accessByLesson, setAccessByLesson] = useState({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  const [showModal, setShowModal] = useState(false)
  const [editingLesson, setEditingLesson] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [accessLesson, setAccessLesson] = useState(null)
  const [accessPublishOnConfirm, setAccessPublishOnConfirm] = useState(false)
  const [accessMode, setAccessMode] = useState('all')
  const [selectedGroupIds, setSelectedGroupIds] = useState(new Set())
  const [accessSaving, setAccessSaving] = useState(false)

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

  async function fetchLessons() {
    if (!courseId) {
      setLessons([])
      setLoading(false)
      return
    }
    setLoading(true)

    const { data: groupsData } = await supabase
      .from('groups')
      .select('id, name, is_active')
      .eq('course_id', courseId)
      .order('name', { ascending: true })
    setGroups(groupsData ?? [])

    const { data: lessonsData } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('order_num', { ascending: true })
    setLessons(lessonsData ?? [])

    const lessonIds = (lessonsData ?? []).map((l) => l.id)
    if (lessonIds.length > 0) {
      const { data: accessData } = await supabase
        .from('lesson_group_access')
        .select('lesson_id, group_id')
        .in('lesson_id', lessonIds)
      const grouped = {}
      ;(accessData ?? []).forEach((a) => {
        grouped[a.lesson_id] = [...(grouped[a.lesson_id] ?? []), a.group_id]
      })
      setAccessByLesson(grouped)
    } else {
      setAccessByLesson({})
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchCourses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    fetchLessons()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId])

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function openCreateModal() {
    setEditingLesson(null)
    setForm({ ...EMPTY_FORM, order_num: String(lessons.length) })
    setError('')
    setShowModal(true)
  }

  function openEditModal(lesson) {
    setEditingLesson(lesson)
    setForm({
      title: lesson.title,
      description: lesson.description ?? '',
      group_id: lesson.group_id ?? '',
      order_num: String(lesson.order_num),
    })
    setError('')
    setShowModal(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    if (!form.title) {
      setError('Başlıq tələb olunur.')
      return
    }
    setSaving(true)

    const payload = {
      title: form.title,
      description: form.description || null,
      group_id: form.group_id || null,
      order_num: Number(form.order_num),
    }

    const { error: saveError } = editingLesson
      ? await supabase.from('lessons').update(payload).eq('id', editingLesson.id)
      : await supabase.from('lessons').insert({ ...payload, course_id: courseId })

    setSaving(false)
    if (saveError) {
      setError('Dərs saxlanılmadı. Yenidən cəhd edin.')
      return
    }
    setShowModal(false)
    fetchLessons()
  }

  async function handleDelete(lesson) {
    if (!window.confirm(`"${lesson.title}" dərsini silmək istədiyinizə əminsiniz?`)) return
    setBusyId(lesson.id)
    await supabase.from('lessons').delete().eq('id', lesson.id)
    setBusyId(null)
    fetchLessons()
  }

  async function moveLesson(lesson, direction) {
    const sorted = [...lessons].sort((a, b) => a.order_num - b.order_num)
    const idx = sorted.findIndex((l) => l.id === lesson.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return

    const other = sorted[swapIdx]
    setBusyId(lesson.id)
    await Promise.all([
      supabase.from('lessons').update({ order_num: other.order_num }).eq('id', lesson.id),
      supabase.from('lessons').update({ order_num: lesson.order_num }).eq('id', other.id),
    ])
    setBusyId(null)
    fetchLessons()
  }

  function openAccessModal(lesson, { publishOnConfirm }) {
    const currentAccess = accessByLesson[lesson.id] ?? []
    setAccessLesson(lesson)
    setAccessPublishOnConfirm(publishOnConfirm)
    setAccessMode(currentAccess.length > 0 ? 'selected' : 'all')
    setSelectedGroupIds(new Set(currentAccess))
  }

  function closeAccessModal() {
    setAccessLesson(null)
    setAccessPublishOnConfirm(false)
    setAccessMode('all')
    setSelectedGroupIds(new Set())
  }

  function toggleGroupSelection(groupId) {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  async function handleUnpublish(lesson) {
    setBusyId(lesson.id)
    await supabase.from('lessons').update({ is_published: false }).eq('id', lesson.id)
    setBusyId(null)
    fetchLessons()
  }

  async function handleSaveAccess(e) {
    e.preventDefault()
    if (!accessLesson) return
    setAccessSaving(true)

    await supabase.from('lesson_group_access').delete().eq('lesson_id', accessLesson.id)

    if (accessMode === 'selected' && selectedGroupIds.size > 0) {
      const rows = [...selectedGroupIds].map((groupId) => ({
        lesson_id: accessLesson.id,
        group_id: groupId,
      }))
      await supabase.from('lesson_group_access').insert(rows)
    }

    if (accessPublishOnConfirm) {
      await supabase
        .from('lessons')
        .update({ is_published: true, published_at: new Date().toISOString() })
        .eq('id', accessLesson.id)
    }

    setAccessSaving(false)
    closeAccessModal()
    fetchLessons()
  }

  const activeGroups = useMemo(() => groups.filter((g) => g.is_active), [groups])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Dərs İdarəetməsi</h1>
          <p className="mt-1 text-text-secondary">Kurslarınız üzrə dərslər</p>
        </div>
        <Button onClick={openCreateModal} disabled={!courseId}>
          <Plus size={16} strokeWidth={2} /> Yeni dərs
        </Button>
      </div>

      {courses.length === 0 ? (
        <EmptyState
          title="Kurs tapılmadı"
          description="Dərs yaratmaq üçün əvvəlcə öz kursunuz olmalıdır."
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
          ) : lessons.length === 0 ? (
            <EmptyState title="Dərs yoxdur" description="Bu kurs üçün hələ dərs yaradılmayıb." />
          ) : (
            <div className="flex flex-col gap-3">
              {lessons.map((lesson, idx) => {
                const access = accessByLesson[lesson.id] ?? []
                return (
                  <div
                    key={lesson.id}
                    className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="flex gap-3">
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => moveLesson(lesson, 'up')}
                          disabled={idx === 0 || busyId === lesson.id}
                          className="flex h-6 w-6 items-center justify-center rounded border border-border text-text-secondary transition hover:bg-hover disabled:opacity-30"
                        >
                          <ArrowUp size={12} strokeWidth={2} />
                        </button>
                        <button
                          onClick={() => moveLesson(lesson, 'down')}
                          disabled={idx === lessons.length - 1 || busyId === lesson.id}
                          className="flex h-6 w-6 items-center justify-center rounded border border-border text-text-secondary transition hover:bg-hover disabled:opacity-30"
                        >
                          <ArrowDown size={12} strokeWidth={2} />
                        </button>
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-text-main">{lesson.title}</h3>
                          <Badge variant={lesson.is_published ? 'success' : 'default'}>
                            {lesson.is_published ? 'Açıq' : 'Bağlı'}
                          </Badge>
                          {lesson.is_published && (
                            <Badge variant="secondary">
                              {access.length === 0
                                ? 'Bütün qruplar'
                                : `${access.length} qrup üçün`}
                            </Badge>
                          )}
                        </div>
                        {lesson.description && (
                          <p className="mt-1 text-sm text-text-secondary">{lesson.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      {lesson.is_published ? (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openAccessModal(lesson, { publishOnConfirm: false })}
                          >
                            <UsersRound size={13} strokeWidth={2} /> Qrupları idarə et
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={busyId === lesson.id}
                            onClick={() => handleUnpublish(lesson)}
                          >
                            <LockOpen size={13} strokeWidth={2} /> Bağla
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={busyId === lesson.id}
                          onClick={() => openAccessModal(lesson, { publishOnConfirm: true })}
                        >
                          <Lock size={13} strokeWidth={2} /> Aç
                        </Button>
                      )}
                      <Link
                        to={`/instructor/lessons/${lesson.id}/materials`}
                        className="flex items-center rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-main transition hover:bg-hover"
                      >
                        Material əlavə et
                      </Link>
                      <Button variant="secondary" size="sm" onClick={() => openEditModal(lesson)}>
                        Redaktə et
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={busyId === lesson.id}
                        onClick={() => handleDelete(lesson)}
                      >
                        Sil
                      </Button>
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
        title={editingLesson ? 'Dərsi redaktə et' : 'Yeni dərs yarat'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Ləğv et
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saxlanılır...' : 'Saxla'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <Input
            label="Başlıq"
            required
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-main">Təsvir</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              className="resize-none rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-text-main outline-none transition focus:border-primary"
            />
          </div>

          <Input
            label="Sıra nömrəsi"
            type="number"
            min={0}
            value={form.order_num}
            onChange={(e) => update('order_num', e.target.value)}
          />

          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}
        </form>
      </Modal>

      <Modal
        open={!!accessLesson}
        onClose={closeAccessModal}
        title={accessLesson ? `Qrup girişi — ${accessLesson.title}` : ''}
        footer={
          <>
            <Button variant="secondary" onClick={closeAccessModal} disabled={accessSaving}>
              Ləğv et
            </Button>
            <Button onClick={handleSaveAccess} disabled={accessSaving}>
              {accessSaving
                ? 'Saxlanılır...'
                : accessPublishOnConfirm
                  ? 'Təsdiqlə və aç'
                  : 'Saxla'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveAccess} className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">
            Bu dərsi hansı tələbələr görə bilsin?
          </p>

          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm text-text-main">
              <input
                type="radio"
                name="access-mode"
                checked={accessMode === 'all'}
                onChange={() => setAccessMode('all')}
                className="accent-[var(--color-primary)]"
              />
              Hamısı üçün
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm text-text-main">
              <input
                type="radio"
                name="access-mode"
                checked={accessMode === 'selected'}
                onChange={() => setAccessMode('selected')}
                className="accent-[var(--color-primary)]"
              />
              Seçilmiş qruplar üçün
            </label>
          </div>

          {accessMode === 'selected' && (
            <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
              {activeGroups.length === 0 ? (
                <p className="text-sm text-text-secondary">Aktiv qrup tapılmadı.</p>
              ) : (
                activeGroups.map((g) => (
                  <label
                    key={g.id}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-text-main transition hover:bg-hover"
                  >
                    <input
                      type="checkbox"
                      checked={selectedGroupIds.has(g.id)}
                      onChange={() => toggleGroupSelection(g.id)}
                      className="accent-[var(--color-primary)]"
                    />
                    {g.name}
                  </label>
                ))
              )}
            </div>
          )}
        </form>
      </Modal>
    </div>
  )
}
