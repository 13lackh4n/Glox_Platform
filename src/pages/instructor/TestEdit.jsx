import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const PART_LABELS = { 1: 'Part 1 · Teoriya', 2: 'Part 2 · Hesablama', 3: 'Part 3 · Praktiki' }
const EMPTY_QUESTION = {
  question_text: '',
  part: '1',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_answer: 'a',
  marks: '5',
  explanation: '',
}

export default function InstructorTestEdit() {
  const { testId } = useParams()
  const navigate = useNavigate()

  const [test, setTest] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingTest, setSavingTest] = useState(false)
  const [testError, setTestError] = useState('')
  const [testSaved, setTestSaved] = useState(false)

  const [showQuestionForm, setShowQuestionForm] = useState(false)
  const [questionForm, setQuestionForm] = useState(EMPTY_QUESTION)
  const [savingQuestion, setSavingQuestion] = useState(false)
  const [questionError, setQuestionError] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  async function fetchAll() {
    setLoading(true)
    const { data: testData } = await supabase
      .from('tests')
      .select('*')
      .eq('id', testId)
      .single()
    setTest(testData)

    const { data: questionsData } = await supabase
      .from('questions')
      .select('*')
      .eq('test_id', testId)
      .order('part', { ascending: true })
      .order('order_num', { ascending: true })
    setQuestions(questionsData ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId])

  function updateTestField(field, value) {
    setTest((t) => ({ ...t, [field]: value }))
  }

  async function handleSaveTest(e) {
    e.preventDefault()
    setTestError('')
    setTestSaved(false)
    setSavingTest(true)

    const { error } = await supabase
      .from('tests')
      .update({
        title: test.title,
        month: Number(test.month),
        description: test.description,
        duration_minutes: Number(test.duration_minutes),
        total_marks: Number(test.total_marks),
        passing_marks: Number(test.passing_marks),
        is_active: test.is_active,
      })
      .eq('id', testId)

    setSavingTest(false)
    if (error) {
      setTestError('Dəyişikliklər saxlanılmadı. Yenidən cəhd edin.')
      return
    }
    setTestSaved(true)
    setTimeout(() => setTestSaved(false), 2000)
  }

  function updateQuestionField(field, value) {
    setQuestionForm((f) => ({ ...f, [field]: value }))
  }

  async function handleAddQuestion(e) {
    e.preventDefault()
    setQuestionError('')

    if (
      !questionForm.question_text ||
      !questionForm.option_a ||
      !questionForm.option_b ||
      !questionForm.option_c ||
      !questionForm.option_d
    ) {
      setQuestionError('Bütün sahələr doldurulmalıdır.')
      return
    }

    setSavingQuestion(true)
    const part = Number(questionForm.part)
    const orderNum = questions.filter((q) => q.part === part).length

    const { error } = await supabase.from('questions').insert({
      test_id: testId,
      part,
      question_text: questionForm.question_text,
      option_a: questionForm.option_a,
      option_b: questionForm.option_b,
      option_c: questionForm.option_c,
      option_d: questionForm.option_d,
      correct_answer: questionForm.correct_answer,
      marks: Number(questionForm.marks),
      order_num: orderNum,
      explanation: questionForm.explanation || null,
    })

    setSavingQuestion(false)
    if (error) {
      setQuestionError('Sual əlavə edilmədi. Yenidən cəhd edin.')
      return
    }

    setQuestionForm(EMPTY_QUESTION)
    setShowQuestionForm(false)
    fetchAll()
  }

  async function handleDeleteQuestion(id) {
    if (!window.confirm('Bu sualı silmək istədiyinizə əminsiniz?')) return
    setDeletingId(id)
    await supabase.from('questions').delete().eq('id', id)
    setDeletingId(null)
    fetchAll()
  }

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

  const groupedQuestions = { 1: [], 2: [], 3: [] }
  questions.forEach((q) => groupedQuestions[q.part]?.push(q))

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold text-text-main sm:text-3xl">Test Redaktəsi</h1>

      <form
        onSubmit={handleSaveTest}
        className="mt-6 flex flex-col gap-4 rounded-xl border border-border bg-card p-6"
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-text-secondary">Test adı</label>
          <input
            type="text"
            required
            value={test.title}
            onChange={(e) => updateTestField('title', e.target.value)}
            className="rounded-lg border border-border bg-bg px-3 py-2.5 text-text-main outline-none focus:border-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-text-secondary">Ay</label>
            <select
              value={test.month}
              onChange={(e) => updateTestField('month', e.target.value)}
              className="rounded-lg border border-border bg-bg px-3 py-2.5 text-text-main outline-none focus:border-primary"
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
              min={1}
              value={test.duration_minutes}
              onChange={(e) => updateTestField('duration_minutes', e.target.value)}
              className="rounded-lg border border-border bg-bg px-3 py-2.5 text-text-main outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-text-secondary">Təsvir</label>
          <textarea
            rows={3}
            value={test.description ?? ''}
            onChange={(e) => updateTestField('description', e.target.value)}
            className="resize-none rounded-lg border border-border bg-bg px-3 py-2.5 text-text-main outline-none focus:border-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-text-secondary">Ümumi bal</label>
            <input
              type="number"
              min={1}
              value={test.total_marks}
              onChange={(e) => updateTestField('total_marks', e.target.value)}
              className="rounded-lg border border-border bg-bg px-3 py-2.5 text-text-main outline-none focus:border-primary"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-text-secondary">Ötmə balı</label>
            <input
              type="number"
              min={0}
              value={test.passing_marks}
              onChange={(e) => updateTestField('passing_marks', e.target.value)}
              className="rounded-lg border border-border bg-bg px-3 py-2.5 text-text-main outline-none focus:border-primary"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={test.is_active}
            onChange={(e) => updateTestField('is_active', e.target.checked)}
            className="h-4 w-4 rounded border-border accent-primary"
          />
          Test aktivdir
        </label>

        {testError && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {testError}
          </div>
        )}
        {testSaved && (
          <div className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
            Dəyişikliklər saxlanıldı.
          </div>
        )}

        <button
          type="submit"
          disabled={savingTest}
          className="mt-1 rounded-lg bg-primary px-4 py-2.5 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {savingTest ? 'Saxlanılır...' : 'Dəyişiklikləri saxla'}
        </button>
      </form>

      <div className="mt-10 flex items-center justify-between">
        <h2 className="text-xl font-bold text-text-main">Suallar ({questions.length})</h2>
        <button
          onClick={() => setShowQuestionForm((v) => !v)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          {showQuestionForm ? 'Bağla' : '+ Yeni sual əlavə et'}
        </button>
      </div>

      {showQuestionForm && (
        <form
          onSubmit={handleAddQuestion}
          className="mt-4 flex flex-col gap-4 rounded-xl border border-primary/30 bg-card p-6"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-text-secondary">Sual mətni</label>
            <textarea
              rows={2}
              required
              value={questionForm.question_text}
              onChange={(e) => updateQuestionField('question_text', e.target.value)}
              className="resize-none rounded-lg border border-border bg-bg px-3 py-2.5 text-text-main outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary">Part</label>
              <select
                value={questionForm.part}
                onChange={(e) => updateQuestionField('part', e.target.value)}
                className="rounded-lg border border-border bg-bg px-3 py-2.5 text-text-main outline-none focus:border-primary"
              >
                {[1, 2, 3].map((p) => (
                  <option key={p} value={p}>
                    {PART_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary">Bal dəyəri</label>
              <input
                type="number"
                min={1}
                required
                value={questionForm.marks}
                onChange={(e) => updateQuestionField('marks', e.target.value)}
                className="rounded-lg border border-border bg-bg px-3 py-2.5 text-text-main outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {['a', 'b', 'c', 'd'].map((opt) => (
              <div key={opt} className="flex flex-col gap-1.5">
                <label className="text-sm text-text-secondary">Variant {opt.toUpperCase()}</label>
                <input
                  type="text"
                  required
                  value={questionForm[`option_${opt}`]}
                  onChange={(e) => updateQuestionField(`option_${opt}`, e.target.value)}
                  className="rounded-lg border border-border bg-bg px-3 py-2.5 text-text-main outline-none focus:border-primary"
                />
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-text-secondary">Düzgün cavab</label>
            <select
              value={questionForm.correct_answer}
              onChange={(e) => updateQuestionField('correct_answer', e.target.value)}
              className="rounded-lg border border-border bg-bg px-3 py-2.5 text-text-main outline-none focus:border-primary"
            >
              {['a', 'b', 'c', 'd'].map((opt) => (
                <option key={opt} value={opt}>
                  Variant {opt.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-text-secondary">İzah (opsional)</label>
            <textarea
              rows={2}
              value={questionForm.explanation}
              onChange={(e) => updateQuestionField('explanation', e.target.value)}
              className="resize-none rounded-lg border border-border bg-bg px-3 py-2.5 text-text-main outline-none focus:border-primary"
            />
          </div>

          {questionError && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {questionError}
            </div>
          )}

          <button
            type="submit"
            disabled={savingQuestion}
            className="rounded-lg bg-success px-4 py-2.5 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {savingQuestion ? 'Əlavə edilir...' : 'Sualı əlavə et'}
          </button>
        </form>
      )}

      <div className="mt-6 flex flex-col gap-6">
        {[1, 2, 3].map((part) => (
          <div key={part}>
            <h3 className="mb-3 text-sm font-semibold text-text-secondary">
              {PART_LABELS[part]} ({groupedQuestions[part].length})
            </h3>
            {groupedQuestions[part].length === 0 ? (
              <p className="text-sm text-text-secondary">Bu hissədə hələ sual yoxdur.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {groupedQuestions[part].map((q, idx) => (
                  <div
                    key={q.id}
                    className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-4"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-text-main">
                        {idx + 1}. {q.question_text}
                      </p>
                      <p className="mt-1 text-xs text-text-secondary">
                        Düzgün cavab: {q.correct_answer.toUpperCase()} · {q.marks} bal
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      disabled={deletingId === q.id}
                      className="shrink-0 rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-medium text-danger transition hover:bg-danger/10 disabled:opacity-50"
                    >
                      {deletingId === q.id ? 'Silinir...' : 'Sil'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-10 text-center">
        <button
          onClick={() => navigate('/instructor/tests')}
          className="text-sm font-medium text-primary hover:underline"
        >
          ← Testlərə qayıt
        </button>
      </div>
    </div>
  )
}
