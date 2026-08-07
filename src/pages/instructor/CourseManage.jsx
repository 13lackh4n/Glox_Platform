import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Clock, Users, FileText, UsersRound, BookMarked, Plus, BookOpen } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'

export default function InstructorCourseManage() {
  const { courseId } = useParams()
  const [course, setCourse] = useState(null)
  const [tests, setTests] = useState([])
  const [groups, setGroups] = useState([])
  const [studentCount, setStudentCount] = useState(0)
  const [loading, setLoading] = useState(true)

  async function fetchAll() {
    setLoading(true)
    const [{ data: courseData }, { data: testsData }, { data: groupsData }, { count }] =
      await Promise.all([
        supabase.from('courses').select('*').eq('id', courseId).single(),
        supabase
          .from('tests')
          .select('*')
          .eq('course_id', courseId)
          .order('month', { ascending: true }),
        supabase.from('groups').select('*').eq('course_id', courseId),
        supabase
          .from('enrollments')
          .select('id', { count: 'exact', head: true })
          .eq('course_id', courseId),
      ])
    setCourse(courseData)
    setTests(testsData ?? [])
    setGroups(groupsData ?? [])
    setStudentCount(count ?? 0)
    setLoading(false)
  }

  useEffect(() => {
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!course) {
    return <EmptyState icon={BookOpen} title="Kurs tapılmadı" />
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-text-main">{course.title}</h1>
          <Badge variant={course.is_active ? 'success' : 'default'}>
            {course.is_active ? 'Aktiv' : 'Deaktiv'}
          </Badge>
          <Badge variant={course.enrollment_type === 'open' ? 'primary' : 'warning'}>
            {course.enrollment_type === 'open' ? 'Açıq' : 'Müraciətli'}
          </Badge>
        </div>
        <p className="mt-3 text-text-secondary">{course.description}</p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-text-secondary">
          <span className="flex items-center gap-1.5"><Clock size={14} strokeWidth={2} /> {course.duration_months} ay</span>
          <span className="flex items-center gap-1.5"><Users size={14} strokeWidth={2} /> {studentCount} tələbə</span>
          <span className="flex items-center gap-1.5"><FileText size={14} strokeWidth={2} /> {tests.length} test</span>
          <span className="flex items-center gap-1.5"><UsersRound size={14} strokeWidth={2} /> {groups.length} qrup</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          to="/instructor/groups"
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-text-main transition hover:bg-hover"
        >
          <UsersRound size={16} strokeWidth={2} /> Qrupları idarə et
        </Link>
        <Link
          to="/instructor/lessons"
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-text-main transition hover:bg-hover"
        >
          <BookMarked size={16} strokeWidth={2} /> Dərsləri idarə et
        </Link>
        <Link
          to="/instructor/tests/create"
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-hover"
        >
          <Plus size={16} strokeWidth={2} /> Yeni test
        </Link>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-text-main">Testlər</h2>
        {tests.length === 0 ? (
          <EmptyState icon={FileText} title="Hələ test yoxdur" />
        ) : (
          <div className="flex flex-col gap-3">
            {tests.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
              >
                <div>
                  <p className="font-medium text-text-main">{t.title}</p>
                  <p className="text-xs text-text-secondary">
                    Ay {t.month} · {t.duration_minutes} dəq · {t.total_marks} bal
                  </p>
                </div>
                <Link
                  to={`/instructor/tests/${t.id}/edit`}
                  className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-main transition hover:bg-hover"
                >
                  Redaktə et
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-center">
        <Link to="/instructor/courses" className="text-sm font-medium text-primary hover:underline">
          ← Kurslarıma qayıt
        </Link>
      </div>
    </div>
  )
}
