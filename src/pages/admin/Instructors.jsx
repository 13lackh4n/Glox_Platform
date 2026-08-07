import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function AdminInstructors() {
  const [users, setUsers] = useState([])
  const [courseCounts, setCourseCounts] = useState({})
  const [studentCounts, setStudentCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState(null)

  async function fetchAll() {
    setLoading(true)

    const { data: usersData } = await supabase
      .from('users')
      .select('*')
      .in('role', ['instructor', 'student'])
      .order('full_name', { ascending: true })
    setUsers(usersData ?? [])

    const { data: coursesData } = await supabase.from('courses').select('id, instructor_id')

    const courseCountMap = {}
    const courseIdsByInstructor = {}
    ;(coursesData ?? []).forEach((c) => {
      if (!c.instructor_id) return
      courseCountMap[c.instructor_id] = (courseCountMap[c.instructor_id] ?? 0) + 1
      courseIdsByInstructor[c.instructor_id] = [
        ...(courseIdsByInstructor[c.instructor_id] ?? []),
        c.id,
      ]
    })
    setCourseCounts(courseCountMap)

    const allInstructorCourseIds = (coursesData ?? [])
      .filter((c) => c.instructor_id)
      .map((c) => c.id)

    const studentCountMap = {}
    if (allInstructorCourseIds.length > 0) {
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('user_id, course_id')
        .in('course_id', allInstructorCourseIds)

      Object.entries(courseIdsByInstructor).forEach(([instructorId, courseIds]) => {
        const studentSet = new Set(
          (enrollments ?? [])
            .filter((e) => courseIds.includes(e.course_id))
            .map((e) => e.user_id)
        )
        studentCountMap[instructorId] = studentSet.size
      })
    }
    setStudentCounts(studentCountMap)

    setLoading(false)
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return users
    return users.filter(
      (u) =>
        (u.full_name ?? '').toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query)
    )
  }, [users, search])

  async function handlePromote(userId) {
    setBusyId(userId)
    await supabase.from('users').update({ role: 'instructor' }).eq('id', userId)
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: 'instructor' } : u)))
    setBusyId(null)
  }

  async function handleDemote(userId) {
    if (!window.confirm('Bu təlimçini tələbəyə çevirmək istədiyinizə əminsiniz?')) return
    setBusyId(userId)
    await supabase.from('users').update({ role: 'student' }).eq('id', userId)
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: 'student' } : u)))
    setBusyId(null)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-main sm:text-3xl">Təlimçilər İdarəetməsi</h1>
          <p className="mt-1 text-text-secondary">Təlimçiləri idarə edin və yeni təlimçi təyin edin</p>
        </div>

        <div className="relative sm:w-72">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <circle cx="11" cy="11" r="7" strokeWidth="2" />
            <path d="m21 21-4.3-4.3" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ad və ya e-poçt üzrə axtar..."
            className="w-full rounded-lg border border-border bg-card py-2.5 pl-9 pr-3 text-sm text-text-main outline-none transition focus:border-primary"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-text-secondary">Yüklənir...</p>
      ) : filteredUsers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center text-text-secondary">
          {search ? 'Heç bir istifadəçi tapılmadı.' : 'Hələ heç bir istifadəçi yoxdur.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-text-secondary">
                <th className="px-4 py-3 font-medium">Ad</th>
                <th className="px-4 py-3 font-medium">E-poçt</th>
                <th className="px-4 py-3 font-medium">Rol</th>
                <th className="px-4 py-3 font-medium">Kurs sayı</th>
                <th className="px-4 py-3 font-medium">Tələbə sayı</th>
                <th className="px-4 py-3 font-medium">Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => {
                const isInstructor = u.role === 'instructor'
                return (
                  <tr key={u.id} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-3 text-text-main">{u.full_name ?? '—'}</td>
                    <td className="px-4 py-3 text-text-secondary">{u.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          isInstructor
                            ? 'bg-primary/15 text-primary'
                            : 'bg-hover text-text-secondary'
                        }`}
                      >
                        {isInstructor ? 'Təlimçi' : 'Tələbə'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {isInstructor ? courseCounts[u.id] ?? 0 : '—'}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {isInstructor ? studentCounts[u.id] ?? 0 : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {isInstructor ? (
                        <button
                          onClick={() => handleDemote(u.id)}
                          disabled={busyId === u.id}
                          className="rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-medium text-danger transition hover:bg-danger/10 disabled:opacity-50"
                        >
                          {busyId === u.id ? 'Silinir...' : 'Sil'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handlePromote(u.id)}
                          disabled={busyId === u.id}
                          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                        >
                          {busyId === u.id ? 'Təyin edilir...' : 'Təlimçi et'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
