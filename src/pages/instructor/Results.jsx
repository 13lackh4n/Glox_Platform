import { useEffect, useMemo, useState } from 'react'
import { RotateCcw, BarChart3 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Button from '../../components/ui/Button'

export default function InstructorResults() {
  const { user } = useAuth()
  const [courses, setCourses] = useState([])
  const [tests, setTests] = useState([])
  const [results, setResults] = useState([])
  const [courseFilter, setCourseFilter] = useState('all')
  const [testFilter, setTestFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  async function fetchData() {
    if (!user) return
    setLoading(true)

    const { data: coursesData } = await supabase
      .from('courses')
      .select('id, title')
      .eq('instructor_id', user.id)
    setCourses(coursesData ?? [])

    const courseIds = (coursesData ?? []).map((c) => c.id)
    if (courseIds.length === 0) {
      setTests([])
      setResults([])
      setLoading(false)
      return
    }

    const { data: testsData } = await supabase
      .from('tests')
      .select('id, title, course_id')
      .in('course_id', courseIds)
    setTests(testsData ?? [])

    const testIds = (testsData ?? []).map((t) => t.id)
    if (testIds.length === 0) {
      setResults([])
      setLoading(false)
      return
    }

    const { data: resultsData } = await supabase
      .from('results')
      .select('*')
      .in('test_id', testIds)
      .order('completed_at', { ascending: false })

    const userIds = [...new Set((resultsData ?? []).map((r) => r.user_id))]
    let usersById = {}
    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, full_name, email')
        .in('id', userIds)
      usersById = Object.fromEntries((usersData ?? []).map((u) => [u.id, u]))
    }

    const enriched = (resultsData ?? []).map((r) => {
      const test = testsData.find((t) => t.id === r.test_id)
      return {
        ...r,
        studentName: usersById[r.user_id]?.full_name ?? usersById[r.user_id]?.email ?? '—',
        testTitle: test?.title ?? '—',
        courseId: test?.course_id ?? null,
      }
    })

    setResults(enriched)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const filteredTests = useMemo(() => {
    if (courseFilter === 'all') return tests
    return tests.filter((t) => t.course_id === courseFilter)
  }, [tests, courseFilter])

  const filteredResults = useMemo(() => {
    return results.filter((r) => {
      if (courseFilter !== 'all' && r.courseId !== courseFilter) return false
      if (testFilter !== 'all' && r.test_id !== testFilter) return false
      return true
    })
  }, [results, courseFilter, testFilter])

  const avgPercentage = useMemo(() => {
    if (filteredResults.length === 0) return 0
    const sum = filteredResults.reduce((acc, r) => acc + r.percentage, 0)
    return Math.round(sum / filteredResults.length)
  }, [filteredResults])

  const avgScore = useMemo(() => {
    if (filteredResults.length === 0) return 0
    const sum = filteredResults.reduce((acc, r) => acc + r.score, 0)
    return Math.round(sum / filteredResults.length)
  }, [filteredResults])

  async function handleAllowRetry(result) {
    if (
      !window.confirm(
        `${result.studentName} — "${result.testTitle}" nəticəsini silib yenidən cəhd etməyə icazə vermək istəyirsiniz?`
      )
    )
      return
    setBusyId(result.id)
    await supabase.from('results').delete().eq('id', result.id)
    setBusyId(null)
    fetchData()
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-text-main">Nəticələr və Statistika</h1>
        <p className="mt-1 text-text-secondary">Kurslarınız üzrə bütün test nəticələri</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <select
          value={courseFilter}
          onChange={(e) => {
            setCourseFilter(e.target.value)
            setTestFilter('all')
          }}
          className="rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-text-main outline-none focus:border-primary"
        >
          <option value="all">Bütün kurslar</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>

        <select
          value={testFilter}
          onChange={(e) => setTestFilter(e.target.value)}
          className="rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-text-main outline-none focus:border-primary"
        >
          <option value="all">Bütün testlər</option>
          {filteredTests.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm text-text-secondary">Cəmi nəticə</p>
              <p className="mt-2 text-3xl font-bold text-text-main">{filteredResults.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm text-text-secondary">Orta bal</p>
              <p className="mt-2 text-3xl font-bold text-text-main">{avgScore}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm text-text-secondary">Orta faiz</p>
              <p className="mt-2 text-3xl font-bold text-primary">{avgPercentage}%</p>
            </div>
          </div>

          {filteredResults.length === 0 ? (
            <EmptyState icon={BarChart3} title="Nəticə yoxdur" description="Hələ heç bir nəticə yoxdur." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-text-secondary">
                    <th className="px-4 py-3 font-medium">Tələbə</th>
                    <th className="px-4 py-3 font-medium">Test</th>
                    <th className="px-4 py-3 font-medium">Bal</th>
                    <th className="px-4 py-3 font-medium">Faiz</th>
                    <th className="px-4 py-3 font-medium">Tarix</th>
                    <th className="px-4 py-3 font-medium">Əməliyyat</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.map((r) => (
                    <tr key={r.id} className="border-b border-border/50 last:border-0">
                      <td className="px-4 py-3 text-text-main">{r.studentName}</td>
                      <td className="px-4 py-3 text-text-secondary">{r.testTitle}</td>
                      <td className="px-4 py-3 text-text-secondary">
                        {r.score}/{r.total_possible}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {Math.round(r.percentage)}%
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {new Date(r.completed_at).toLocaleDateString('az-AZ')}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={busyId === r.id}
                          onClick={() => handleAllowRetry(r)}
                        >
                          <RotateCcw size={13} strokeWidth={2} /> Yenidən cəhdə icazə ver
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
