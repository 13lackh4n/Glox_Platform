import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

export default function CourseDetail() {
  const { courseId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [course, setCourse] = useState(null)
  const [tests, setTests] = useState([])
  const [results, setResults] = useState([])
  const [enrollment, setEnrollment] = useState(null)
  const [groups, setGroups] = useState([])
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [error, setError] = useState('')

  const [showRequestModal, setShowRequestModal] = useState(false)
  const [requestGroupId, setRequestGroupId] = useState('')
  const [requestMessage, setRequestMessage] = useState('')
  const [submittingRequest, setSubmittingRequest] = useState(false)
  const [requestError, setRequestError] = useState('')

  async function fetchData() {
    setLoading(true)

    const { data: courseData } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single()
    setCourse(courseData)

    const { data: testsData } = await supabase
      .from('tests')
      .select('*')
      .eq('course_id', courseId)
      .eq('is_active', true)
      .order('month', { ascending: true })
    setTests(testsData ?? [])

    const { data: groupsData } = await supabase
      .from('groups')
      .select('*')
      .eq('course_id', courseId)
      .eq('is_active', true)
      .order('name', { ascending: true })
    setGroups(groupsData ?? [])

    if (user) {
      const { data: enrollmentData } = await supabase
        .from('enrollments')
        .select('*')
        .eq('course_id', courseId)
        .eq('user_id', user.id)
        .maybeSingle()
      setEnrollment(enrollmentData)

      const { data: requestData } = await supabase
        .from('enrollment_requests')
        .select('*')
        .eq('course_id', courseId)
        .eq('user_id', user.id)
        .maybeSingle()
      setRequest(requestData)

      const testIds = (testsData ?? []).map((t) => t.id)
      if (testIds.length > 0) {
        const { data: resultsData } = await supabase
          .from('results')
          .select('*')
          .eq('user_id', user.id)
          .in('test_id', testIds)
          .order('completed_at', { ascending: false })
        setResults(resultsData ?? [])
      }
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, user])

  async function handleEnroll() {
    if (!user) {
      navigate('/login')
      return
    }
    setEnrolling(true)
    setError('')
    const { data, error: enrollError } = await supabase
      .from('enrollments')
      .insert({ user_id: user.id, course_id: courseId })
      .select()
      .single()
    setEnrolling(false)
    if (enrollError) {
      setError('Kursa yazılma uğursuz oldu. Yenidən cəhd edin.')
      return
    }
    setEnrollment(data)
  }

  async function handleSubmitRequest(e) {
    e.preventDefault()
    if (!user) {
      navigate('/login')
      return
    }
    setRequestError('')
    setSubmittingRequest(true)

    const { data, error: requestErr } = await supabase
      .from('enrollment_requests')
      .upsert(
        {
          user_id: user.id,
          course_id: courseId,
          group_id: requestGroupId || null,
          message: requestMessage || null,
          status: 'pending',
          admin_note: null,
          reviewed_at: null,
        },
        { onConflict: 'user_id,course_id' }
      )
      .select()
      .single()

    setSubmittingRequest(false)

    if (requestErr) {
      setRequestError('Müraciət göndərilmədi. Yenidən cəhd edin.')
      return
    }

    setRequest(data)
    setShowRequestModal(false)
  }

  function resultForTest(testId) {
    return results.find((r) => r.test_id === testId)
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <p className="text-text-secondary">Yüklənir...</p>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 text-center">
        <h1 className="text-xl font-bold text-text-main">Kurs tapılmadı</h1>
        <Link to="/courses" className="mt-4 inline-block text-primary hover:underline">
          Kurslara qayıt
        </Link>
      </div>
    )
  }

  const isApprovalRequired = course.enrollment_type === 'approval_required'

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-text-main sm:text-3xl">{course.title}</h1>
        <p className="mt-3 text-text-secondary">{course.description}</p>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-text-secondary">
          <span className="flex items-center gap-1.5">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="9" strokeWidth="2" />
              <path d="M12 7v5l3 3" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {course.duration_months} ay
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeWidth="2" strokeLinecap="round" />
              <path
                d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"
                strokeWidth="2"
              />
            </svg>
            {tests.length} test
          </span>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="mt-6">
          {enrollment ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-lg bg-success/10 px-4 py-2 text-sm font-medium text-success">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path
                    d="m5 13 4 4L19 7"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Bu kursa yazılmısınız
              </span>
              <Link
                to={`/lessons/${courseId}`}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-main transition hover:bg-hover"
              >
                Dərslərə keç
              </Link>
            </div>
          ) : !isApprovalRequired ? (
            <button
              onClick={handleEnroll}
              disabled={enrolling}
              className="rounded-lg bg-primary px-6 py-2.5 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {enrolling ? 'Yazılır...' : 'Kursa yazıl'}
            </button>
          ) : request?.status === 'pending' ? (
            <div className="inline-flex items-center gap-2 rounded-lg bg-warning/10 px-4 py-2 text-sm font-medium text-warning">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="9" strokeWidth="2" />
                <path d="M12 7v5l3 3" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Müraciətiniz göndərildi, təlimçinin təsdiqini gözləyin
            </div>
          ) : request?.status === 'rejected' ? (
            <div className="flex flex-col gap-3">
              <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                <p className="font-medium">Müraciətiniz rədd edildi</p>
                {request.admin_note && <p className="mt-1 text-danger/90">{request.admin_note}</p>}
              </div>
              <button
                onClick={() => {
                  setRequestGroupId(request.group_id ?? '')
                  setRequestMessage(request.message ?? '')
                  setRequestError('')
                  setShowRequestModal(true)
                }}
                className="w-fit rounded-lg bg-primary px-6 py-2.5 font-medium text-white transition hover:opacity-90"
              >
                Yenidən müraciət et
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setRequestGroupId('')
                setRequestMessage('')
                setRequestError('')
                setShowRequestModal(true)
              }}
              className="rounded-lg bg-primary px-6 py-2.5 font-medium text-white transition hover:opacity-90"
            >
              Yazılmaq üçün müraciət et
            </button>
          )}
        </div>
      </div>

      <div className="mt-10">
        <h2 className="mb-4 text-xl font-bold text-text-main">Testlər</h2>
        {tests.length === 0 ? (
          <p className="text-text-secondary">Bu kurs üçün hələ test əlavə edilməyib.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {tests.map((test) => {
              const result = resultForTest(test.id)
              return (
                <div
                  key={test.id}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        Ay {test.month}
                      </span>
                      {result && (
                        <span className="rounded bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                          Tamamlanıb · {Math.round(result.percentage)}%
                        </span>
                      )}
                    </div>
                    <h3 className="mt-1.5 font-semibold text-text-main">{test.title}</h3>
                    <p className="mt-1 text-sm text-text-secondary">
                      {test.duration_minutes} dəqiqə · {test.total_marks} bal · Keçid balı{' '}
                      {test.passing_marks}
                    </p>
                  </div>

                  {result ? (
                    <Link
                      to={`/result/${result.id}`}
                      className="shrink-0 rounded-lg border border-border px-4 py-2 text-center text-sm font-medium text-text-main transition hover:bg-primary hover:text-white"
                    >
                      Nəticəyə bax
                    </Link>
                  ) : enrollment ? (
                    <Link
                      to={`/test/${test.id}`}
                      className="shrink-0 rounded-lg bg-primary px-4 py-2 text-center text-sm font-medium text-white transition hover:opacity-90"
                    >
                      Testə başla
                    </Link>
                  ) : (
                    <span className="shrink-0 rounded-lg border border-border px-4 py-2 text-center text-sm text-text-secondary">
                      Əvvəlcə yazılın
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 text-xl font-bold text-text-main">Nəticələriniz</h2>
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-text-secondary">
                  <th className="px-4 py-3 font-medium">Test</th>
                  <th className="px-4 py-3 font-medium">Bal</th>
                  <th className="px-4 py-3 font-medium">Faiz</th>
                  <th className="px-4 py-3 font-medium">Tarix</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => {
                  const test = tests.find((t) => t.id === result.test_id)
                  return (
                    <tr key={result.id} className="border-b border-white/5 last:border-0">
                      <td className="px-4 py-3 text-text-main">{test?.title ?? '—'}</td>
                      <td className="px-4 py-3 text-text-secondary">
                        {result.score}/{result.total_possible}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {Math.round(result.percentage)}%
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {new Date(result.completed_at).toLocaleDateString('az-AZ')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showRequestModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-bold text-text-main">Yazılmaq üçün müraciət</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Müraciətiniz təlimçiyə göndəriləcək və təsdiq gözlənilir.
            </p>

            <form onSubmit={handleSubmitRequest} className="mt-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-text-secondary">Qrup (opsional)</label>
                <select
                  value={requestGroupId}
                  onChange={(e) => setRequestGroupId(e.target.value)}
                  className="rounded-lg border border-border bg-input px-3 py-2.5 text-text-main outline-none focus:border-primary"
                >
                  <option value="">Seçilməyib</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-text-secondary">Özünüz haqqında qısa məlumat</label>
                <textarea
                  rows={4}
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="Məs: Elektronika sahəsində təcrübəm, məqsədim..."
                  className="resize-none rounded-lg border border-border bg-input px-3 py-2.5 text-text-main outline-none focus:border-primary"
                />
              </div>

              {requestError && (
                <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                  {requestError}
                </div>
              )}

              <div className="mt-1 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-main transition hover:bg-hover"
                >
                  Ləğv et
                </button>
                <button
                  type="submit"
                  disabled={submittingRequest}
                  className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  {submittingRequest ? 'Göndərilir...' : 'Müraciət göndər'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
