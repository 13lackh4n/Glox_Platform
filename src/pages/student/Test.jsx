import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

const PART_LABELS = {
  1: 'Part 1 · Teoriya',
  2: 'Part 2 · Hesablama',
  3: 'Part 3 · Praktiki',
}

const OPTION_LABELS = ['a', 'b', 'c', 'd']

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function Test() {
  const { testId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [test, setTest] = useState(null)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [activePart, setActivePart] = useState(1)
  const [activeIndex, setActiveIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(null)

  const submittedRef = useRef(false)
  const startTimeRef = useRef(Date.now())

  useEffect(() => {
    async function fetchTest() {
      setLoading(true)
      const { data: testData } = await supabase
        .from('tests')
        .select('*')
        .eq('id', testId)
        .single()

      if (!testData) {
        setLoading(false)
        return
      }
      setTest(testData)
      setSecondsLeft(testData.duration_minutes * 60)

      const { data: questionsData } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', testId)
        .order('part', { ascending: true })
        .order('order_num', { ascending: true })
      setQuestions(questionsData ?? [])

      startTimeRef.current = Date.now()
      setLoading(false)
    }
    fetchTest()
  }, [testId])

  const questionsByPart = useMemo(() => {
    const grouped = { 1: [], 2: [], 3: [] }
    questions.forEach((q) => {
      grouped[q.part]?.push(q)
    })
    return grouped
  }, [questions])

  const currentPartQuestions = questionsByPart[activePart] ?? []
  const currentQuestion = currentPartQuestions[activeIndex]

  const answeredCount = Object.keys(answers).length

  const handleSubmit = useCallback(async () => {
    if (submittedRef.current || !test || !user) return
    submittedRef.current = true
    setSubmitting(true)

    const timeTakenSeconds = Math.round((Date.now() - startTimeRef.current) / 1000)

    let partScores = { 1: 0, 2: 0, 3: 0 }
    let totalScore = 0
    let totalPossible = 0

    const answerRows = questions.map((q) => {
      const selected = answers[q.id] ?? null
      const isCorrect = selected != null && selected === q.correct_answer
      totalPossible += q.marks
      if (isCorrect) {
        totalScore += q.marks
        partScores[q.part] = (partScores[q.part] ?? 0) + q.marks
      }
      return { question_id: q.id, selected_answer: selected, is_correct: isCorrect }
    })

    const percentage = totalPossible > 0 ? (totalScore / totalPossible) * 100 : 0

    const { data: result, error: resultError } = await supabase
      .from('results')
      .insert({
        user_id: user.id,
        test_id: test.id,
        score: totalScore,
        total_possible: totalPossible,
        percentage,
        part1_score: partScores[1] ?? 0,
        part2_score: partScores[2] ?? 0,
        part3_score: partScores[3] ?? 0,
        time_taken_seconds: timeTakenSeconds,
      })
      .select()
      .single()

    if (resultError || !result) {
      setError('Nəticə göndərilmədi. Yenidən cəhd edin.')
      setSubmitting(false)
      submittedRef.current = false
      return
    }

    if (answerRows.length > 0) {
      await supabase
        .from('answers')
        .insert(answerRows.map((row) => ({ ...row, result_id: result.id })))
    }

    navigate(`/result/${result.id}`, { replace: true })
  }, [test, user, questions, answers, navigate])

  // Countdown timer
  useEffect(() => {
    if (secondsLeft === null || submittedRef.current) return
    if (secondsLeft <= 0) {
      handleSubmit()
      return
    }
    const timer = setInterval(() => {
      setSecondsLeft((s) => (s !== null ? s - 1 : s))
    }, 1000)
    return () => clearInterval(timer)
  }, [secondsLeft, handleSubmit])

  // Warn before leaving/refreshing while test is active
  useEffect(() => {
    function handleBeforeUnload(e) {
      if (!submittedRef.current) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  // Block browser back button while test is in progress
  useEffect(() => {
    window.history.pushState(null, '', window.location.href)
    function handlePopState() {
      if (!submittedRef.current) {
        window.history.pushState(null, '', window.location.href)
        window.alert('Test başladıqdan sonra geri qayıtmaq olmaz. Testi bitirin.')
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  function selectAnswer(questionId, option) {
    setAnswers((prev) => ({ ...prev, [questionId]: option }))
  }

  function goToPart(part) {
    setActivePart(part)
    setActiveIndex(0)
  }

  function goPrev() {
    setActiveIndex((i) => Math.max(0, i - 1))
  }

  function goNext() {
    setActiveIndex((i) => Math.min(currentPartQuestions.length - 1, i + 1))
  }

  const isLowTime = secondsLeft !== null && secondsLeft <= 5 * 60

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <p className="text-text-secondary">Yüklənir...</p>
      </div>
    )
  }

  if (!test) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <h1 className="text-xl font-bold text-text-main">Test tapılmadı</h1>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <h1 className="text-xl font-bold text-text-main">{test.title}</h1>
        <p className="mt-2 text-text-secondary">Bu test üçün hələ sual əlavə edilməyib.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
      {/* Header: title + timer */}
      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-white/10 bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <h1 className="text-lg font-bold text-text-main sm:text-xl">{test.title}</h1>
          <p className="text-sm text-text-secondary">
            {answeredCount}/{questions.length} sual cavablandırılıb
          </p>
        </div>
        <div
          className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xl font-bold tabular-nums transition-colors ${
            isLowTime ? 'bg-danger/15 text-danger' : 'bg-primary/10 text-primary'
          }`}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="9" strokeWidth="2" />
            <path d="M12 7v5l3 3" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {formatTime(secondsLeft ?? 0)}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Part tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto">
        {[1, 2, 3].map((part) => (
          <button
            key={part}
            onClick={() => goToPart(part)}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition ${
              activePart === part
                ? 'bg-primary text-white'
                : 'bg-card text-text-secondary hover:text-text-main'
            }`}
          >
            {PART_LABELS[part]} ({questionsByPart[part]?.length ?? 0})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_240px]">
        {/* Question */}
        <div className="rounded-xl border border-white/10 bg-card p-5 sm:p-6">
          {currentQuestion ? (
            <>
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-medium text-text-secondary">
                  Sual {activeIndex + 1}/{currentPartQuestions.length}
                </span>
                <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {currentQuestion.marks} bal
                </span>
              </div>

              <p className="text-base font-medium text-text-main sm:text-lg">
                {currentQuestion.question_text}
              </p>

              <div className="mt-5 flex flex-col gap-3">
                {OPTION_LABELS.map((opt) => {
                  const selected = answers[currentQuestion.id] === opt
                  return (
                    <button
                      key={opt}
                      onClick={() => selectAnswer(currentQuestion.id, opt)}
                      className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-left text-sm transition ${
                        selected
                          ? 'border-primary bg-primary/10 text-text-main'
                          : 'border-white/10 text-text-secondary hover:border-white/20 hover:text-text-main'
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                          selected
                            ? 'border-primary bg-primary text-white'
                            : 'border-white/20 text-text-secondary'
                        }`}
                      >
                        {opt.toUpperCase()}
                      </span>
                      <span>{currentQuestion[`option_${opt}`]}</span>
                    </button>
                  )
                })}
              </div>

              <div className="mt-6 flex items-center justify-between">
                <button
                  onClick={goPrev}
                  disabled={activeIndex === 0}
                  className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-text-main transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ← Əvvəlki
                </button>
                <button
                  onClick={goNext}
                  disabled={activeIndex === currentPartQuestions.length - 1}
                  className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-text-main transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Növbəti →
                </button>
              </div>
            </>
          ) : (
            <p className="text-text-secondary">Bu hissədə sual yoxdur.</p>
          )}
        </div>

        {/* Navigation grid */}
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-white/10 bg-card p-4">
            <p className="mb-3 text-xs font-medium text-text-secondary">Sual naviqasiyası</p>
            <div className="grid grid-cols-5 gap-2 lg:grid-cols-4">
              {currentPartQuestions.map((q, idx) => {
                const isAnswered = answers[q.id] != null
                const isCurrent = idx === activeIndex
                return (
                  <button
                    key={q.id}
                    onClick={() => setActiveIndex(idx)}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-semibold transition ${
                      isCurrent
                        ? 'ring-2 ring-primary ring-offset-2 ring-offset-card'
                        : ''
                    } ${
                      isAnswered
                        ? 'bg-success/20 text-success'
                        : 'bg-bg text-text-secondary'
                    }`}
                  >
                    {idx + 1}
                  </button>
                )
              })}
            </div>
            <div className="mt-4 flex flex-col gap-1.5 text-xs text-text-secondary">
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-success/20" /> Cavablanıb
              </span>
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-bg" /> Cavablanmayıb
              </span>
            </div>
          </div>

          <button
            onClick={() => setShowConfirm(true)}
            className="rounded-lg bg-danger px-4 py-3 font-medium text-white transition hover:opacity-90"
          >
            Testi bitir
          </button>
        </div>
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-xl border border-white/10 bg-card p-6">
            <h2 className="text-lg font-bold text-text-main">Testi bitirmək istəyirsiniz?</h2>
            <p className="mt-2 text-sm text-text-secondary">
              {answeredCount}/{questions.length} sual cavablandırılıb. Göndərdikdən sonra
              cavabları dəyişmək mümkün olmayacaq.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-text-main transition hover:bg-white/5"
              >
                Ləğv et
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? 'Göndərilir...' : 'Bəli, bitir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
