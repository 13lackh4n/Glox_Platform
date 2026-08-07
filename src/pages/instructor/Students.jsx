import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

export default function InstructorStudents() {
  const { user } = useAuth()
  const [courses, setCourses] = useState([])
  const [students, setStudents] = useState([])
  const [courseFilter, setCourseFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    async function fetchData() {
      setLoading(true)

      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, title')
        .eq('instructor_id', user.id)
      setCourses(coursesData ?? [])

      const courseIds = (coursesData ?? []).map((c) => c.id)
      if (courseIds.length === 0) {
        setStudents([])
        setLoading(false)
        return
      }

      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('id, user_id, course_id, enrolled_at')
        .in('course_id', courseIds)
        .order('enrolled_at', { ascending: false })

      const userIds = [...new Set((enrollments ?? []).map((e) => e.user_id))]
      let usersById = {}
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, full_name, email')
          .in('id', userIds)
        usersById = Object.fromEntries((usersData ?? []).map((u) => [u.id, u]))
      }

      const { data: tests } = await supabase
        .from('tests')
        .select('id, course_id')
        .in('course_id', courseIds)

      const testsByCourse = {}
      ;(tests ?? []).forEach((t) => {
        testsByCourse[t.course_id] = [...(testsByCourse[t.course_id] ?? []), t.id]
      })

      const allTestIds = (tests ?? []).map((t) => t.id)
      let resultsByUserTest = {}
      if (allTestIds.length > 0) {
        const { data: resultsData } = await supabase
          .from('results')
          .select('user_id, test_id')
          .in('test_id', allTestIds)
        ;(resultsData ?? []).forEach((r) => {
          const key = r.user_id
          resultsByUserTest[key] = [...(resultsByUserTest[key] ?? []), r.test_id]
        })
      }

      const enriched = (enrollments ?? []).map((e) => {
        const courseTestIds = testsByCourse[e.course_id] ?? []
        const userCompleted = resultsByUserTest[e.user_id] ?? []
        const completedInCourse = userCompleted.filter((tid) => courseTestIds.includes(tid)).length

        return {
          ...e,
          fullName: usersById[e.user_id]?.full_name ?? '—',
          email: usersById[e.user_id]?.email ?? '—',
          courseTitle: coursesData.find((c) => c.id === e.course_id)?.title ?? '—',
          completedCount: completedInCourse,
          totalTests: courseTestIds.length,
        }
      })

      setStudents(enriched)
      setLoading(false)
    }

    fetchData()
  }, [user])

  const filteredStudents = useMemo(() => {
    if (courseFilter === 'all') return students
    return students.filter((s) => s.course_id === courseFilter)
  }, [students, courseFilter])

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-main sm:text-3xl">Tələbələr</h1>
          <p className="mt-1 text-text-secondary">Kurslarınıza yazılan tələbələr</p>
        </div>

        <select
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          className="rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-text-main outline-none focus:border-primary"
        >
          <option value="all">Bütün kurslar</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-text-secondary">Yüklənir...</p>
      ) : filteredStudents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center text-text-secondary">
          Hələ heç bir tələbə yazılmayıb.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-text-secondary">
                <th className="px-4 py-3 font-medium">Ad</th>
                <th className="px-4 py-3 font-medium">E-poçt</th>
                <th className="px-4 py-3 font-medium">Kurs</th>
                <th className="px-4 py-3 font-medium">Yazılma tarixi</th>
                <th className="px-4 py-3 font-medium">Tamamlanan test</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((s) => (
                <tr key={s.id} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-3 text-text-main">{s.fullName}</td>
                  <td className="px-4 py-3 text-text-secondary">{s.email}</td>
                  <td className="px-4 py-3 text-text-secondary">{s.courseTitle}</td>
                  <td className="px-4 py-3 text-text-secondary">
                    {new Date(s.enrolled_at).toLocaleDateString('az-AZ')}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {s.completedCount}/{s.totalTests}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
