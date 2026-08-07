import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

const TABS = [
  { key: 'pending', label: 'Gözləyən' },
  { key: 'approved', label: 'Təsdiqlənmiş' },
  { key: 'rejected', label: 'Rədd edilmiş' },
]

export default function InstructorRequests() {
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pending')
  const [busyId, setBusyId] = useState(null)

  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectNote, setRejectNote] = useState('')
  const [rejecting, setRejecting] = useState(false)

  async function fetchRequests() {
    if (!user) return
    setLoading(true)

    const { data: courses } = await supabase
      .from('courses')
      .select('id')
      .eq('instructor_id', user.id)
    const courseIds = (courses ?? []).map((c) => c.id)

    if (courseIds.length === 0) {
      setRequests([])
      setLoading(false)
      return
    }

    const { data: requestsData } = await supabase
      .from('enrollment_requests')
      .select('*, courses(title), groups(name)')
      .in('course_id', courseIds)
      .order('created_at', { ascending: false })

    const userIds = [...new Set((requestsData ?? []).map((r) => r.user_id))]
    let usersById = {}
    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, full_name, email')
        .in('id', userIds)
      usersById = Object.fromEntries((usersData ?? []).map((u) => [u.id, u]))
    }

    setRequests(
      (requestsData ?? []).map((r) => ({
        ...r,
        studentName: usersById[r.user_id]?.full_name ?? '—',
        studentEmail: usersById[r.user_id]?.email ?? '—',
      }))
    )
    setLoading(false)
  }

  useEffect(() => {
    fetchRequests()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const filteredRequests = requests.filter((r) => r.status === activeTab)
  const pendingCount = requests.filter((r) => r.status === 'pending').length

  async function handleApprove(request) {
    setBusyId(request.id)

    await supabase.from('enrollments').insert({
      user_id: request.user_id,
      course_id: request.course_id,
      group_id: request.group_id,
    })

    if (request.group_id) {
      await supabase.from('group_members').insert({
        group_id: request.group_id,
        user_id: request.user_id,
      })
    }

    await supabase
      .from('enrollment_requests')
      .update({ status: 'approved', reviewed_at: new Date().toISOString() })
      .eq('id', request.id)

    setBusyId(null)
    fetchRequests()
  }

  async function handleReject(e) {
    e.preventDefault()
    if (!rejectTarget) return
    setRejecting(true)

    await supabase
      .from('enrollment_requests')
      .update({
        status: 'rejected',
        admin_note: rejectNote || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', rejectTarget.id)

    setRejecting(false)
    setRejectTarget(null)
    setRejectNote('')
    fetchRequests()
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-main sm:text-3xl">Müraciətlər</h1>
        <p className="mt-1 text-text-secondary">Kurslarınıza gələn yazılma müraciətləri</p>
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.key
                ? 'bg-primary text-white'
                : 'bg-card text-text-secondary hover:text-text-main'
            }`}
          >
            {tab.label}
            {tab.key === 'pending' && pendingCount > 0 && (
              <span className="ml-2 rounded-full bg-warning px-1.5 py-0.5 text-xs font-bold text-bg">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-text-secondary">Yüklənir...</p>
      ) : filteredRequests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center text-text-secondary">
          Bu kateqoriyada müraciət yoxdur.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredRequests.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-text-main">{r.studentName}</p>
                  <p className="text-sm text-text-secondary">{r.studentEmail}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-primary">
                      {r.courses?.title ?? 'Kurs'}
                    </span>
                    {r.groups?.name && (
                      <span className="rounded bg-secondary/10 px-2 py-0.5 text-secondary">
                        {r.groups.name}
                      </span>
                    )}
                    <span>{new Date(r.created_at).toLocaleDateString('az-AZ')}</span>
                  </div>
                  {r.message && (
                    <p className="mt-3 rounded-lg bg-bg px-3 py-2 text-sm text-text-secondary">
                      {r.message}
                    </p>
                  )}
                  {r.status === 'rejected' && r.admin_note && (
                    <p className="mt-2 text-sm text-danger">Rədd səbəbi: {r.admin_note}</p>
                  )}
                </div>

                {r.status === 'pending' && (
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => handleApprove(r)}
                      disabled={busyId === r.id}
                      className="rounded-lg bg-success px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                    >
                      {busyId === r.id ? 'Təsdiqlənir...' : 'Təsdiq et'}
                    </button>
                    <button
                      onClick={() => {
                        setRejectTarget(r)
                        setRejectNote('')
                      }}
                      disabled={busyId === r.id}
                      className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                    >
                      Rədd et
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {rejectTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-bold text-text-main">Müraciəti rədd et</h2>
            <p className="mt-1 text-sm text-text-secondary">
              {rejectTarget.studentName} — rədd səbəbini yazın (tələbəyə göstəriləcək).
            </p>

            <form onSubmit={handleReject} className="mt-5 flex flex-col gap-4">
              <textarea
                rows={3}
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Rədd səbəbi..."
                className="resize-none rounded-lg border border-border bg-input px-3 py-2.5 text-text-main outline-none focus:border-primary"
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setRejectTarget(null)}
                  className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-main transition hover:bg-hover"
                >
                  Ləğv et
                </button>
                <button
                  type="submit"
                  disabled={rejecting}
                  className="flex-1 rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  {rejecting ? 'Göndərilir...' : 'Rədd et'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
