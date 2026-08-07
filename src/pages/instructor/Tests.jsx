import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, FileText } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'

export default function InstructorTests() {
  const { user } = useAuth()
  const [courses, setCourses] = useState([])
  const [tests, setTests] = useState([])
  const [courseFilter, setCourseFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  async function fetchAll() {
    if (!user) return
    setLoading(true)
    const { data: coursesData } = await supabase
      .from('courses')
      .select('id, title')
      .eq('instructor_id', user.id)
      .order('title', { ascending: true })
    setCourses(coursesData ?? [])

    const courseIds = (coursesData ?? []).map((c) => c.id)
    if (courseIds.length === 0) {
      setTests([])
      setLoading(false)
      return
    }

    const { data: testsData } = await supabase
      .from('tests')
      .select('*')
      .in('course_id', courseIds)
      .order('created_at', { ascending: false })

    setTests(
      (testsData ?? []).map((t) => ({
        ...t,
        courseTitle: coursesData.find((c) => c.id === t.course_id)?.title ?? '—',
      }))
    )
    setLoading(false)
  }

  useEffect(() => {
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const filteredTests = useMemo(() => {
    if (courseFilter === 'all') return tests
    return tests.filter((t) => t.course_id === courseFilter)
  }, [tests, courseFilter])

  async function toggleActive(test) {
    setBusyId(test.id)
    await supabase.from('tests').update({ is_active: !test.is_active }).eq('id', test.id)
    setBusyId(null)
    fetchAll()
  }

  async function handleDelete(test) {
    if (!window.confirm(`"${test.title}" testini silmək istədiyinizə əminsiniz?`)) return
    setBusyId(test.id)
    await supabase.from('tests').delete().eq('id', test.id)
    setBusyId(null)
    fetchAll()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Testlər</h1>
          <p className="mt-1 text-text-secondary">Kurslarınız üzrə bütün testlər</p>
        </div>
        <Link to="/instructor/tests/create">
          <Button><Plus size={16} strokeWidth={2} /> Yeni test</Button>
        </Link>
      </div>

      {courses.length > 1 && (
        <select
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          className="w-fit rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-text-main outline-none focus:border-primary"
        >
          <option value="all">Bütün kurslar</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : courses.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Kursunuz yoxdur"
          description="Test yaratmaq üçün əvvəlcə admin tərəfindən sizə bir kurs təyin olunmalıdır."
        />
      ) : filteredTests.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Hələ test yoxdur"
          description="İlk testinizi yaradın."
          action={
            <Link to="/instructor/tests/create">
              <Button><Plus size={16} strokeWidth={2} /> Yeni test</Button>
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filteredTests.map((t) => (
            <div
              key={t.id}
              className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-text-main">{t.title}</h3>
                  <Badge variant={t.is_active ? 'success' : 'default'}>
                    {t.is_active ? 'Aktiv' : 'Deaktiv'}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-text-secondary">
                  {t.courseTitle} · Ay {t.month} · {t.duration_minutes} dəq · {t.total_marks} bal
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Link to={`/instructor/tests/${t.id}/edit`}>
                  <Button variant="secondary" size="sm">
                    Redaktə et
                  </Button>
                </Link>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busyId === t.id}
                  onClick={() => toggleActive(t)}
                >
                  {t.is_active ? 'Deaktiv et' : 'Aktivləşdir'}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={busyId === t.id}
                  onClick={() => handleDelete(t)}
                >
                  Sil
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
