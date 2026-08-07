import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

const EMPTY_FORM = { title: '', description: '', group_id: '', order_num: '0' }

export default function InstructorLessons() {
  const { user } = useAuth()
  const [courses, setCourses] = useState([])
  const [courseId, setCourseId] = useState('')
  const [groups, setGroups] = useState([])
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  const [showModal, setShowModal] = useState(false)
  const [editingLesson, setEditingLesson] = useState(null)
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

  async function fetchLessons() {
    if (!courseId) {
      setLessons([])
      setLoading(false)
      return
    }
    setLoading(true)

    const { data: groupsData } = await supabase
      .from('groups')
      .select('id, name')
      .eq('course_id', courseId)
      .order('name', { ascending: true })
    setGroups(groupsData ?? [])

    const { data: lessonsData } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('order_num', { ascending: true })
    setLessons(lessonsData ?? [])

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

  async function togglePublish(lesson) {
    setBusyId(lesson.id)
    const nextPublished = !lesson.is_published
    await supabase
      .from('lessons')
      .update({
        is_published: nextPublished,
        published_at: nextPublished ? new Date().toISOString() : lesson.published_at,
      })
      .eq('id', lesson.id)
    setBusyId(null)
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-main sm:text-3xl">Dərs İdarəetməsi</h1>
          <p className="mt-1 text-text-secondary">Kurslarınız üzrə dərslər</p>
        </div>
        <button
          onClick={openCreateModal}
          disabled={!courseId}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          + Yeni dərs
        </button>
      </div>

      {courses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-card px-6 py-16 text-center text-text-secondary">
          Dərs yaratmaq üçün əvvəlcə öz kursunuz olmalıdır.
        </div>
      ) : (
        <>
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="mb-6 rounded-lg border border-white/10 bg-card px-3 py-2.5 text-sm text-text-main outline-none focus:border-primary"
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>

          {loading ? (
            <p className="text-text-secondary">Yüklənir...</p>
          ) : lessons.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-card px-6 py-16 text-center text-text-secondary">
              Bu kurs üçün hələ dərs yaradılmayıb.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {lessons.map((lesson, idx) => (
                <div
                  key={lesson.id}
                  className="flex flex-col gap-3 rounded-xl border border-white/10 bg-card p-5 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="flex gap-3">
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => moveLesson(lesson, 'up')}
                        disabled={idx === 0 || busyId === lesson.id}
                        className="flex h-6 w-6 items-center justify-center rounded border border-white/10 text-xs text-text-secondary transition hover:bg-white/5 disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveLesson(lesson, 'down')}
                        disabled={idx === lessons.length - 1 || busyId === lesson.id}
                        className="flex h-6 w-6 items-center justify-center rounded border border-white/10 text-xs text-text-secondary transition hover:bg-white/5 disabled:opacity-30"
                      >
                        ↓
                      </button>
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-text-main">{lesson.title}</h3>
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ${
                            lesson.is_published
                              ? 'bg-success/15 text-success'
                              : 'bg-white/10 text-text-secondary'
                          }`}
                        >
                          {lesson.is_published ? 'Açıq' : 'Bağlı'}
                        </span>
                        {lesson.group_id && (
                          <span className="rounded bg-secondary/10 px-2 py-0.5 text-xs text-secondary">
                            {groups.find((g) => g.id === lesson.group_id)?.name ?? 'Qrup'}
                          </span>
                        )}
                      </div>
                      {lesson.description && (
                        <p className="mt-1 text-sm text-text-secondary">{lesson.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      onClick={() => togglePublish(lesson)}
                      disabled={busyId === lesson.id}
                      className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-text-main transition hover:bg-white/5 disabled:opacity-50"
                      title={lesson.is_published ? 'Dərsi bağla' : 'Dərsi aç'}
                    >
                      {lesson.is_published ? '🔓 Bağla' : '🔒 Aç'}
                    </button>
                    <Link
                      to={`/instructor/lessons/${lesson.id}/materials`}
                      className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-text-main transition hover:bg-white/5"
                    >
                      Material əlavə et
                    </Link>
                    <button
                      onClick={() => openEditModal(lesson)}
                      className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-text-main transition hover:bg-white/5"
                    >
                      Redaktə et
                    </button>
                    <button
                      onClick={() => handleDelete(lesson)}
                      disabled={busyId === lesson.id}
                      className="rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-medium text-danger transition hover:bg-danger/10 disabled:opacity-50"
                    >
                      Sil
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-card p-6">
            <h2 className="text-lg font-bold text-text-main">
              {editingLesson ? 'Dərsi redaktə et' : 'Yeni dərs yarat'}
            </h2>

            <form onSubmit={handleSave} className="mt-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-text-secondary">Başlıq</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => update('title', e.target.value)}
                  className="rounded-lg border border-white/10 bg-bg px-3 py-2.5 text-text-main outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-text-secondary">Təsvir</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  className="resize-none rounded-lg border border-white/10 bg-bg px-3 py-2.5 text-text-main outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-text-secondary">Qrup</label>
                  <select
                    value={form.group_id}
                    onChange={(e) => update('group_id', e.target.value)}
                    className="rounded-lg border border-white/10 bg-bg px-3 py-2.5 text-text-main outline-none focus:border-primary"
                  >
                    <option value="">Hamı üçün</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-text-secondary">Sıra nömrəsi</label>
                  <input
                    type="number"
                    min={0}
                    value={form.order_num}
                    onChange={(e) => update('order_num', e.target.value)}
                    className="rounded-lg border border-white/10 bg-bg px-3 py-2.5 text-text-main outline-none focus:border-primary"
                  />
                </div>
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
                  className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-text-main transition hover:bg-white/5"
                >
                  Ləğv et
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? 'Saxlanılır...' : 'Saxla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
