import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Trophy, GraduationCap } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const OPTION_LABELS = ['a', 'b', 'c', 'd']

function certificateInfo(percentage) {
  if (percentage >= 80) {
    return {
      label: 'Yüksək nəticə ilə bitirib',
      color: 'text-success',
      bg: 'bg-success/10',
      border: 'border-success/30',
      ring: '#22c55e',
    }
  }
  if (percentage >= 60) {
    return {
      label: 'Bitirib',
      color: 'text-secondary',
      bg: 'bg-secondary/10',
      border: 'border-secondary/30',
      ring: '#22d3ee',
    }
  }
  return {
    label: 'İştirak edib',
    color: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning/30',
    ring: '#f59e0b',
  }
}

function ScoreRing({ percentage, color }) {
  const radius = 70
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(percentage, 100) / 100) * circumference

  return (
    <svg width="180" height="180" viewBox="0 0 180 180" className="mx-auto">
      <circle
        cx="90"
        cy="90"
        r={radius}
        fill="none"
        style={{ stroke: 'var(--border-color)' }}
        strokeWidth="14"
      />
      <circle
        cx="90"
        cy="90"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 90 90)"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text
        x="90"
        y="84"
        textAnchor="middle"
        className="fill-text-main"
        style={{ fontSize: '32px', fontWeight: 700 }}
      >
        {Math.round(percentage)}%
      </text>
      <text
        x="90"
        y="108"
        textAnchor="middle"
        className="fill-text-secondary"
        style={{ fontSize: '12px' }}
      >
        nəticə
      </text>
    </svg>
  )
}

const CERT_TYPE_LABELS = {
  yuksek: 'Yüksək nəticə sertifikatı',
  bitirib: 'Bitirmə sertifikatı',
  istirak: 'İştirak sertifikatı',
}

export default function Result() {
  const { resultId } = useParams()
  const [result, setResult] = useState(null)
  const [test, setTest] = useState(null)
  const [items, setItems] = useState([])
  const [certificate, setCertificate] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchResult() {
      setLoading(true)

      const { data: resultData, error: resultError } = await supabase
        .from('results')
        .select('*')
        .eq('id', resultId)
        .single()

      if (resultError) console.error('result fetch error:', resultError)
      setResult(resultData)

      if (resultData) {
        const { data: testData } = await supabase
          .from('tests')
          .select('*')
          .eq('id', resultData.test_id)
          .single()
        setTest(testData)

        // Correct answers + explanations only reach the client through this
        // RPC, and only for a result the caller owns (see 006_secure_test_grading.sql).
        const { data: reviewData, error: reviewError } = await supabase.rpc(
          'get_result_review',
          { p_result_id: resultId }
        )
        if (reviewError) console.error('result review fetch error:', reviewError)

        const sorted = (reviewData ?? []).sort((a, b) => {
          if (a.part !== b.part) return a.part - b.part
          return a.order_num - b.order_num
        })
        setItems(sorted)

        if (testData?.course_id) {
          const { data: certData } = await supabase
            .from('certificates')
            .select('*')
            .eq('user_id', resultData.user_id)
            .eq('course_id', testData.course_id)
            .order('issued_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          setCertificate(certData)
        }
      }

      setLoading(false)
    }
    fetchResult()
  }, [resultId])

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <p className="text-text-secondary">Yüklənir...</p>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <h1 className="text-xl font-bold text-text-main">Nəticə tapılmadı</h1>
        <Link to="/dashboard" className="mt-4 inline-block text-primary hover:underline">
          Dashboard-a qayıt
        </Link>
      </div>
    )
  }

  const cert = certificateInfo(result.percentage)

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="rounded-xl border border-border bg-card p-6 text-center sm:p-10">
        <p className="text-sm text-text-secondary">{test?.title ?? 'Test nəticəsi'}</p>
        <ScoreRing percentage={result.percentage} color={cert.ring} />

        <p className="mt-2 text-text-secondary">
          {result.score}/{result.total_possible} bal
        </p>

        <span
          className={`mt-4 inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium ${cert.bg} ${cert.border} ${cert.color}`}
        >
          <Trophy size={16} strokeWidth={2} /> {cert.label}
        </span>

        {certificate && (
          <div className={`mt-6 rounded-xl border ${cert.border} ${cert.bg} p-5 text-left`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className={`flex items-center gap-1.5 text-sm font-semibold ${cert.color}`}>
                  <GraduationCap size={16} strokeWidth={2} /> {CERT_TYPE_LABELS[certificate.type] ?? 'Sertifikat'}
                </p>
                <p className="mt-1 font-mono text-xs text-text-secondary">
                  {certificate.certificate_number}
                </p>
              </div>
              <Link
                to="/profile"
                className="shrink-0 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-text-main transition hover:bg-hover"
              >
                Profildə bax →
              </Link>
            </div>
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-bg p-4">
            <p className="text-xs text-text-secondary">Part 1 · Teoriya</p>
            <p className="mt-1 text-xl font-bold text-text-main">{result.part1_score}</p>
          </div>
          <div className="rounded-lg bg-bg p-4">
            <p className="text-xs text-text-secondary">Part 2 · Hesablama</p>
            <p className="mt-1 text-xl font-bold text-text-main">{result.part2_score}</p>
          </div>
          <div className="rounded-lg bg-bg p-4">
            <p className="text-xs text-text-secondary">Part 3 · Praktiki</p>
            <p className="mt-1 text-xl font-bold text-text-main">{result.part3_score}</p>
          </div>
        </div>
      </div>

      {items.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 text-xl font-bold text-text-main">Sualların təhlili</h2>
          <div className="flex flex-col gap-4">
            {items.map((item, idx) => {
              const isCorrect = item.is_correct
              return (
                <div
                  key={item.answer_id}
                  className={`rounded-xl border p-5 ${
                    isCorrect ? 'border-success/20 bg-success/5' : 'border-danger/20 bg-danger/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-text-main">
                      {idx + 1}. {item.question_text}
                    </p>
                    <span
                      className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${
                        isCorrect ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'
                      }`}
                    >
                      {isCorrect ? `+${item.marks}` : '0'} bal
                    </span>
                  </div>

                  <div className="mt-3 flex flex-col gap-2">
                    {OPTION_LABELS.map((opt) => {
                      const isSelected = item.selected_answer === opt
                      const isRight = item.correct_answer === opt
                      let style = 'border-border text-text-secondary'
                      if (isRight) style = 'border-success/40 bg-success/10 text-success'
                      else if (isSelected && !isRight)
                        style = 'border-danger/40 bg-danger/10 text-danger'

                      return (
                        <div
                          key={opt}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${style}`}
                        >
                          <span className="font-semibold uppercase">{opt}</span>
                          <span>{item[`option_${opt}`]}</span>
                          {isSelected && (
                            <span className="ml-auto text-xs text-text-secondary">
                              (sizin cavabınız)
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {item.explanation && (
                    <p className="mt-3 rounded-lg bg-bg px-3 py-2 text-sm text-text-secondary">
                      <span className="font-medium text-text-main">İzah: </span>
                      {item.explanation}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="mt-10 text-center">
        <Link
          to="/dashboard"
          className="inline-block rounded-lg bg-primary px-6 py-2.5 font-medium text-white transition hover:opacity-90"
        >
          Dashboard-a qayıt
        </Link>
      </div>
    </div>
  )
}
