import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

export default function InstructorTestCreate() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [courses, setCourses] = useState([])
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    course_id: '',
    title: '',
    month: '1',
    description: '',
    duration_minutes: '60',
    total_marks: '100',
    passing_marks: '60',
  })

  useEffect(() => {
    if (!user) return
    async function fetchCourses() {
      const { data } = await supabase
        .from('courses')
        .select('id, title')
        .eq('instructor_id', user.id)
        .order('title', { ascending: true })
      setCourses(data ?? [])
      if (data && data.length > 0) {
        setForm((f) => ({ ...f, course_id: data[0].id }))
      }
      setLoadingCourses(false)
    }
    fetchCourses()
  }, [user])

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.course_id) {
      setError('Kurs seçilməlidir.')
      return
    }

    setSaving(true)
    const { data, error: insertError } = await supabase
      .from('tests')
      .insert({
        course_id: form.course_id,
        title: form.title,
        month: Number(form.month),
        description: form.description || null,
        duration_minutes: Number(form.duration_minutes),
        total_marks: Number(form.total_marks),
        passing_marks: Number(form.passing_marks),
        is_active: true,
      })
      .select()
      .single()
    setSaving(false)

    if (insertError || !data) {
      setError('Test yaradılmadı. Yenidən cəhd edin.')
      return
    }

    navigate(`/instructor/tests/${data.id}/edit`)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold text-text-main sm:text-3xl">Yeni Test Yarat</h1>
      <p className="mt-1 text-text-secondary">
        Test məlumatlarını daxil edin, sonra suallar əlavə edə bilərsiniz.
      </p>

      {loadingCourses ? (
        <p className="mt-6 text-text-secondary">Yüklənir...</p>
      ) : courses.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-6 text-center text-text-secondary">
          Test yaratmaq üçün əvvəlcə öz kursunuz olmalıdır.
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="mt-6 flex flex-col gap-4 rounded-xl border border-border bg-card p-6"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-text-secondary">Kurs</label>
            <select
              value={form.course_id}
              onChange={(e) => update('course_id', e.target.value)}
              required
              className="rounded-lg border border-border bg-input px-3 py-2.5 text-text-main outline-none focus:border-primary"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-text-secondary">Test adı</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              className="rounded-lg border border-border bg-input px-3 py-2.5 text-text-main outline-none focus:border-primary"
              placeholder="Məs: 1-ci ay imtahanı"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary">Ay</label>
              <select
                value={form.month}
                onChange={(e) => update('month', e.target.value)}
                className="rounded-lg border border-border bg-input px-3 py-2.5 text-text-main outline-none focus:border-primary"
              >
                {[1, 2, 3, 4, 5, 6].map((m) => (
                  <option key={m} value={m}>
                    Ay {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary">Müddət (dəqiqə)</label>
              <input
                type="number"
                required
                min={1}
                value={form.duration_minutes}
                onChange={(e) => update('duration_minutes', e.target.value)}
                className="rounded-lg border border-border bg-input px-3 py-2.5 text-text-main outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-text-secondary">Təsvir</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              className="resize-none rounded-lg border border-border bg-input px-3 py-2.5 text-text-main outline-none focus:border-primary"
              placeholder="Test haqqında qısa məlumat"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary">Ümumi bal</label>
              <input
                type="number"
                required
                min={1}
                value={form.total_marks}
                onChange={(e) => update('total_marks', e.target.value)}
                className="rounded-lg border border-border bg-input px-3 py-2.5 text-text-main outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary">Ötmə balı</label>
              <input
                type="number"
                required
                min={0}
                value={form.passing_marks}
                onChange={(e) => update('passing_marks', e.target.value)}
                className="rounded-lg border border-border bg-input px-3 py-2.5 text-text-main outline-none focus:border-primary"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="mt-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saxlanılır...' : 'Saxla və suallar əlavə et'}
          </button>
        </form>
      )}
    </div>
  )
}
