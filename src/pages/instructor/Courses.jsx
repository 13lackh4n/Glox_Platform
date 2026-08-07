import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Users, FileText, Clock } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Badge from '../../components/ui/Badge'

export default function InstructorCourses() {
  const { user } = useAuth()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    async function fetchCourses() {
      setLoading(true)
      const { data: coursesData } = await supabase
        .from('courses')
        .select('*')
        .eq('instructor_id', user.id)
        .order('created_at', { ascending: false })

      const enriched = await Promise.all(
        (coursesData ?? []).map(async (course) => {
          const [{ count: studentCount }, { count: testCount }] = await Promise.all([
            supabase
              .from('enrollments')
              .select('id', { count: 'exact', head: true })
              .eq('course_id', course.id),
            supabase
              .from('tests')
              .select('id', { count: 'exact', head: true })
              .eq('course_id', course.id),
          ])
          return { ...course, studentCount: studentCount ?? 0, testCount: testCount ?? 0 }
        })
      )
      setCourses(enriched)
      setLoading(false)
    }
    fetchCourses()
  }, [user])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-text-main">Kurslarım</h1>
        <p className="mt-1 text-text-secondary">Sizə təyin edilmiş kurslar</p>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Hələ kursunuz yoxdur"
          description="Admin sizə bir kurs təyin etdikdən sonra burada görünəcək."
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Link
              key={course.id}
              to={`/instructor/courses/${course.id}`}
              className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 transition hover:border-primary/40 hover:shadow-lg"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-text-main">{course.title}</h3>
                <Badge variant={course.is_active ? 'success' : 'default'}>
                  {course.is_active ? 'Aktiv' : 'Deaktiv'}
                </Badge>
              </div>
              <p className="line-clamp-2 text-sm text-text-secondary">{course.description}</p>
              <div className="mt-auto flex items-center gap-4 text-xs text-text-secondary">
                <span className="flex items-center gap-1"><Users size={13} strokeWidth={2} /> {course.studentCount} tələbə</span>
                <span className="flex items-center gap-1"><FileText size={13} strokeWidth={2} /> {course.testCount} test</span>
                <span className="flex items-center gap-1"><Clock size={13} strokeWidth={2} /> {course.duration_months} ay</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
