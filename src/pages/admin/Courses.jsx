import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

const EMPTY_FORM = {
  title: '',
  slug: '',
  description: '',
  duration_months: '6',
  instructor_id: '',
  enrollment_type: 'open',
}

export default function AdminCourses() {
  const [courses, setCourses] = useState([])
  const [instructors, setInstructors] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCourse, setEditingCourse] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  async function fetchAll() {
    setLoading(true)
    const [coursesRes, instructorsRes] = await Promise.all([
      supabase.from('courses').select('*').order('created_at', { ascending: false }),
      supabase.from('users').select('id, full_name, email').eq('role', 'instructor'),
    ])
    setCourses(coursesRes.data ?? [])
    setInstructors(instructorsRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchAll()
  }, [])

  function update(field, value) {
    setForm((f) => {
      const next = { ...f, [field]: value }
      if (field === 'title') {
        next.slug = slugify(value)
      }
      return next
    })
  }

  function openCreateModal() {
    setEditingCourse(null)
    setForm(EMPTY_FORM)
    setError('')
    setShowModal(true)
  }

  function openEditModal(course) {
    setEditingCourse(course)
    setForm({
      title: course.title,
      slug: course.slug,
      description: course.description ?? '',
      duration_months: String(course.duration_months),
      instructor_id: course.instructor_id ?? '',
      enrollment_type: course.enrollment_type ?? 'open',
    })
    setError('')
    setShowModal(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')

    if (!form.title || !form.slug) {
      setError('Ad və slug tələb olunur.')
      return
    }

    setSaving(true)

    const payload = {
      title: form.title,
      slug: form.slug,
      description: form.description || null,
      duration_months: Number(form.duration_months),
      instructor_id: form.instructor_id || null,
      enrollment_type: form.enrollment_type,
    }

    const { error: saveError } = editingCourse
      ? await supabase.from('courses').update(payload).eq('id', editingCourse.id)
      : await supabase.from('courses').insert({ ...payload, is_active: true })

    setSaving(false)

    if (saveError) {
      setError(
        saveError.code === '23505'
          ? 'Bu slug artıq mövcuddur, başqa ad seçin.'
          : 'Kurs saxlanılmadı. Yenidən cəhd edin.'
      )
      return
    }

    setForm(EMPTY_FORM)
    setEditingCourse(null)
    setShowModal(false)
    fetchAll()
  }

  async function toggleActive(course) {
    setBusyId(course.id)
    await supabase.from('courses').update({ is_active: !course.is_active }).eq('id', course.id)
    setBusyId(null)
    fetchAll()
  }

  async function handleDelete(course) {
    if (!window.confirm(`"${course.title}" kursunu silmək istədiyinizə əminsiniz?`)) return
    setBusyId(course.id)
    await supabase.from('courses').delete().eq('id', course.id)
    setBusyId(null)
    fetchAll()
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-main sm:text-3xl">Kurs İdarəetməsi</h1>
          <p className="mt-1 text-text-secondary">Bütün kursların siyahısı</p>
        </div>
        <button
          onClick={openCreateModal}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
        >
          + Yeni kurs
        </button>
      </div>

      {loading ? (
        <p className="text-text-secondary">Yüklənir...</p>
      ) : courses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center text-text-secondary">
          Hələ heç bir kurs yoxdur.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-text-secondary">
                <th className="px-4 py-3 font-medium">Ad</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Müddət</th>
                <th className="px-4 py-3 font-medium">Yazılma</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 text-text-main">{c.title}</td>
                  <td className="px-4 py-3 text-text-secondary">{c.slug}</td>
                  <td className="px-4 py-3 text-text-secondary">{c.duration_months} ay</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        c.enrollment_type === 'approval_required'
                          ? 'bg-warning/15 text-warning'
                          : 'bg-primary/15 text-primary'
                      }`}
                    >
                      {c.enrollment_type === 'approval_required' ? 'Müraciətli' : 'Açıq'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        c.is_active
                          ? 'bg-success/15 text-success'
                          : 'bg-white/10 text-text-secondary'
                      }`}
                    >
                      {c.is_active ? 'Aktiv' : 'Deaktiv'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => openEditModal(c)}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-main transition hover:bg-hover"
                      >
                        Redaktə et
                      </button>
                      <button
                        onClick={() => toggleActive(c)}
                        disabled={busyId === c.id}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-main transition hover:bg-hover disabled:opacity-50"
                      >
                        {c.is_active ? 'Deaktiv et' : 'Aktivləşdir'}
                      </button>
                      <button
                        onClick={() => handleDelete(c)}
                        disabled={busyId === c.id}
                        className="rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-medium text-danger transition hover:bg-danger/10 disabled:opacity-50"
                      >
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-bold text-text-main">
              {editingCourse ? 'Kursu redaktə et' : 'Yeni kurs yarat'}
            </h2>

            <form onSubmit={handleSave} className="mt-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-text-secondary">Ad</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => update('title', e.target.value)}
                  className="rounded-lg border border-border bg-bg px-3 py-2.5 text-text-main outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-text-secondary">Slug</label>
                <input
                  type="text"
                  required
                  value={form.slug}
                  onChange={(e) => update('slug', slugify(e.target.value))}
                  className="rounded-lg border border-border bg-bg px-3 py-2.5 text-text-main outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-text-secondary">Təsvir</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  className="resize-none rounded-lg border border-border bg-bg px-3 py-2.5 text-text-main outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-text-secondary">Müddət (ay)</label>
                  <input
                    type="number"
                    min={1}
                    value={form.duration_months}
                    onChange={(e) => update('duration_months', e.target.value)}
                    className="rounded-lg border border-border bg-bg px-3 py-2.5 text-text-main outline-none focus:border-primary"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-text-secondary">Təlimçi</label>
                  <select
                    value={form.instructor_id}
                    onChange={(e) => update('instructor_id', e.target.value)}
                    className="rounded-lg border border-border bg-bg px-3 py-2.5 text-text-main outline-none focus:border-primary"
                  >
                    <option value="">Seçilməyib</option>
                    {instructors.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.full_name ?? i.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-text-secondary">Yazılma növü</label>
                <select
                  value={form.enrollment_type}
                  onChange={(e) => update('enrollment_type', e.target.value)}
                  className="rounded-lg border border-border bg-bg px-3 py-2.5 text-text-main outline-none focus:border-primary"
                >
                  <option value="open">Açıq yazılma</option>
                  <option value="approval_required">Müraciət tələb olunur</option>
                </select>
              </div>

              {error && (
                <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                  {error}
                </div>
              )}

              <div className="mt-2 flex gap-3">
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
                  {saving ? 'Saxlanılır...' : editingCourse ? 'Saxla' : 'Yarat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
