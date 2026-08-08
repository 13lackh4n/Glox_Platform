import { useEffect, useState } from 'react'
import {
  BarChart3, FileText, Trophy, Clock, Award, ScrollText,
  Target, Flame, Gem, Star, Calendar, Medal, Lock, GraduationCap, Download, Settings,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import Tabs from '../../components/ui/Tabs'
import StatCard from '../../components/ui/StatCard'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const CERT_LABELS = {
  yuksek: 'Yüksək nəticə',
  bitirib: 'Bitirib',
  istirak: 'İştirak',
}

const CERT_STYLES = {
  yuksek: { border: 'border-success/30', bg: 'bg-success/5', color: 'text-success' },
  bitirib: { border: 'border-secondary/30', bg: 'bg-secondary/5', color: 'text-secondary' },
  istirak: { border: 'border-warning/30', bg: 'bg-warning/5', color: 'text-warning' },
}

function printCertificate(cert, profile) {
  const win = window.open('', '_blank', 'width=900,height=650')
  if (!win) return
  win.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${cert.certificate_number}</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 40px; }
          .cert { max-width: 760px; margin: 0 auto; border: 8px solid #6366f1; border-radius: 16px; padding: 60px 50px; text-align: center; background: #fff; }
          .cert h1 { color: #6366f1; font-size: 14px; letter-spacing: 4px; text-transform: uppercase; margin: 0; }
          .cert h2 { font-size: 36px; margin: 20px 0 10px; color: #0f172a; }
          .cert p { color: #475569; font-size: 16px; margin: 6px 0; }
          .cert .course { font-size: 22px; font-weight: 700; color: #0f172a; margin: 20px 0; }
          .cert .type { display: inline-block; margin-top: 16px; padding: 8px 20px; border-radius: 999px; background: #6366f1; color: #fff; font-weight: 600; }
          .cert .num { margin-top: 30px; font-family: monospace; color: #94a3b8; font-size: 13px; }
        </style>
      </head>
      <body onload="window.print()">
        <div class="cert">
          <h1>Glox Platform &middot; TYE Sertifikatı</h1>
          <h2>${profile?.full_name ?? ''}</h2>
          <p>aşağıdakı kursu uğurla tamamladı</p>
          <p class="course">${cert.courses?.title ?? ''}</p>
          <span class="type">${CERT_LABELS[cert.type] ?? cert.type}</span>
          <p class="num">${cert.certificate_number} &middot; ${new Date(cert.issued_at).toLocaleDateString('az-AZ')}</p>
        </div>
      </body>
    </html>
  `)
  win.document.close()
}

const BADGES_CATALOG = [
  { id: 'first_test', icon: Target, label: 'İlk test', desc: 'İlk testi tamamladın', color: 'primary' },
  { id: 'five_tests', icon: Flame, label: '5 test', desc: '5 test tamamladın', color: 'warning' },
  { id: 'ten_tests', icon: Gem, label: '10 test', desc: '10 test tamamladın', color: 'secondary' },
  { id: 'perfect', icon: Star, label: 'Mükəmməl', desc: 'Bir testdə 100%', color: 'success' },
  { id: 'consistent', icon: Calendar, label: 'Davamlı', desc: '5 gün ardıcıl', color: 'primary' },
  { id: 'topper', icon: Medal, label: 'Lider', desc: 'Liderboardda 1-ci', color: 'warning' },
]

export default function Profile() {
  const { user, profile, loadProfile } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const [settingsForm, setSettingsForm] = useState({
    full_name: '',
    phone: '',
    birth_date: '',
    bio: '',
  })
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [settingsError, setSettingsError] = useState('')

  useEffect(() => {
    if (!profile) return
    setSettingsForm({
      full_name: profile.full_name ?? '',
      phone: profile.phone ?? '',
      birth_date: profile.birth_date ?? '',
      bio: profile.bio ?? '',
    })
  }, [profile])

  function updateSettings(field, value) {
    setSettingsForm((f) => ({ ...f, [field]: value }))
    setSettingsSaved(false)
  }

  async function handleSaveSettings(e) {
    e.preventDefault()
    if (!user) return
    setSettingsSaving(true)
    setSettingsError('')
    setSettingsSaved(false)

    const { error: updateError } = await supabase
      .from('users')
      .update({
        full_name: settingsForm.full_name,
        phone: settingsForm.phone || null,
        birth_date: settingsForm.birth_date || null,
        bio: settingsForm.bio || null,
      })
      .eq('id', user.id)

    setSettingsSaving(false)
    if (updateError) {
      setSettingsError('Yadda saxlanılmadı. Yenidən cəhd edin.')
      return
    }
    setSettingsSaved(true)
    loadProfile(user.id)
  }

  useEffect(() => {
    if (!user) return
    async function fetchProfile() {
      try {
        const [resultsRes, enrollRes, certsRes] = await Promise.all([
          supabase
            .from('results')
            .select('id, score, total_possible, percentage, completed_at, tests(title, course_id, month, courses(title))')
            .eq('user_id', user.id)
            .order('completed_at', { ascending: false }),
          supabase
            .from('enrollments')
            .select('courses(title, id)')
            .eq('user_id', user.id),
          supabase
            .from('certificates')
            .select('*, courses(title)')
            .eq('user_id', user.id)
            .order('issued_at', { ascending: false }),
        ])

        if (resultsRes.error) console.error('results fetch error:', resultsRes.error)
        if (enrollRes.error) console.error('enrollments fetch error:', enrollRes.error)
        if (certsRes.error) console.error('certificates fetch error:', certsRes.error)

        const results = resultsRes.data ?? []
        const scores = results.map((r) => Math.round(r.percentage ?? 0))
        const total = results.length
        const avg = total > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / total) : 0
        const best = total > 0 ? Math.max(...scores) : 0
        const totalTime = total * 20

        // Monthly activity
        const now = new Date()
        const months = Array.from({ length: 6 }, (_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
          return { name: d.toLocaleString('az-AZ', { month: 'short' }), count: 0 }
        })
        for (const r of results) {
          const d = new Date(r.completed_at)
          const lbl = d.toLocaleString('az-AZ', { month: 'short' })
          const m = months.find((x) => x.name === lbl)
          if (m) m.count++
        }

        // Earned badges
        const earnedBadges = new Set()
        if (total >= 1) earnedBadges.add('first_test')
        if (total >= 5) earnedBadges.add('five_tests')
        if (total >= 10) earnedBadges.add('ten_tests')
        if (scores.some((s) => s === 100)) earnedBadges.add('perfect')

        setData({
          results,
          stats: { total, avg, best, totalTime },
          monthlyActivity: months,
          earnedBadges,
          enrollments: enrollRes.data ?? [],
          certificates: certsRes.data ?? [],
        })
      } catch (err) {
        console.error('Profile fetch failed:', err)
        setData({
          results: [],
          stats: { total: 0, avg: 0, best: 0, totalTime: 0 },
          monthlyActivity: [],
          earnedBadges: new Set(),
          enrollments: [],
          certificates: [],
        })
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [user])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  const { results, stats, monthlyActivity, earnedBadges, certificates } = data ?? {}

  const roleLabelMap = {
    student: 'Tələbə',
    instructor: 'Təlimçi',
    super_admin: 'Admin',
  }

  const tabs = [
    {
      key: 'stats',
      label: 'Statistika',
      icon: BarChart3,
      content: (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon={FileText} value={stats.total} label="Ümumi testlər" color="indigo" />
            <StatCard icon={BarChart3} value={`${stats.avg}%`} label="Orta bal" color="cyan" />
            <StatCard icon={Trophy} value={`${stats.best}%`} label="Ən yüksək" color="green" />
            <StatCard icon={Clock} value={`${stats.totalTime}dəq`} label="Ümumi vaxt" color="orange" />
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-4 font-semibold text-text-main">Aylıq aktivlik</h3>
            {monthlyActivity?.some((m) => m.count > 0) ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={monthlyActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 8,
                      color: 'var(--text-primary)',
                    }}
                    formatter={(v) => [v, 'Test']}
                  />
                  <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-sm text-text-secondary">
                Hələ aktivlik yoxdur
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'results',
      label: 'Nəticələr',
      icon: Trophy,
      badge: results?.length,
      content:
        results?.length === 0 ? (
          <EmptyState icon={FileText} title="Hələ nəticə yoxdur" description="Test verdikdən sonra nəticələriniz burada görünəcək." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[540px] text-sm">
              <thead>
                <tr className="border-b border-border text-text-secondary">
                  <th className="px-5 py-3 text-left font-medium">Test</th>
                  <th className="px-5 py-3 text-left font-medium">Kurs</th>
                  <th className="px-5 py-3 text-left font-medium">Bal</th>
                  <th className="px-5 py-3 text-left font-medium">Faiz</th>
                  <th className="px-5 py-3 text-left font-medium">Tarix</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => {
                  const pct = Math.round(r.percentage ?? 0)
                  return (
                    <tr key={r.id} className="border-b border-border/50 last:border-0 hover:bg-hover/40 transition">
                      <td className="px-5 py-3 text-text-main">{r.tests?.title ?? '—'}</td>
                      <td className="px-5 py-3 text-text-secondary">{r.tests?.courses?.title ?? '—'}</td>
                      <td className="px-5 py-3 text-text-secondary">{r.score}/{r.total_possible}</td>
                      <td className="px-5 py-3">
                        <span className={pct >= 70 ? 'text-success font-semibold' : pct >= 50 ? 'text-warning font-semibold' : 'text-danger font-semibold'}>
                          {pct}%
                        </span>
                      </td>
                      <td className="px-5 py-3 text-text-secondary">
                        {new Date(r.completed_at).toLocaleDateString('az-AZ')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ),
    },
    {
      key: 'badges',
      label: 'Badge-lər',
      icon: Award,
      content: (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {BADGES_CATALOG.map((b) => {
            const earned = earnedBadges?.has(b.id)
            const BadgeIcon = b.icon
            return (
              <div
                key={b.id}
                className={[
                  'flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition',
                  earned
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-border bg-card opacity-40 grayscale',
                ].join(' ')}
              >
                <BadgeIcon size={28} strokeWidth={1.75} className="text-primary" />
                <div>
                  <p className="text-sm font-semibold text-text-main">{b.label}</p>
                  <p className="mt-0.5 text-xs text-text-secondary">{b.desc}</p>
                </div>
                {!earned && (
                  <span className="flex items-center gap-1 text-xs text-text-secondary">
                    <Lock size={12} strokeWidth={2} /> Kilidli
                  </span>
                )}
              </div>
            )
          })}
        </div>
      ),
    },
    {
      key: 'certs',
      label: 'Sertifikatlar',
      icon: ScrollText,
      badge: certificates?.length,
      content:
        certificates?.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="Sertifikat yoxdur"
            description="Kursu tamamladıqdan sonra sertifikatınız burada görünəcək."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {certificates.map((cert) => (
              <div
                key={cert.id}
                className={`flex flex-col gap-3 rounded-xl border p-5 ${CERT_STYLES[cert.type]?.border ?? 'border-border'} ${CERT_STYLES[cert.type]?.bg ?? 'bg-card'}`}
              >
                <div className="flex items-start justify-between">
                  <GraduationCap size={24} strokeWidth={1.75} className={CERT_STYLES[cert.type]?.color ?? 'text-text-secondary'} />
                  <span className={`text-xs font-semibold ${CERT_STYLES[cert.type]?.color ?? 'text-text-secondary'}`}>
                    {CERT_LABELS[cert.type] ?? cert.type}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-text-main">{cert.courses?.title ?? 'Kurs'}</p>
                  <p className="mt-1 font-mono text-xs text-text-secondary">
                    {cert.certificate_number}
                  </p>
                  <p className="mt-1 text-xs text-text-secondary">
                    {new Date(cert.issued_at).toLocaleDateString('az-AZ')}
                  </p>
                </div>
                <button
                  onClick={() => printCertificate(cert, profile)}
                  className="mt-auto flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-text-main transition hover:bg-hover"
                >
                  <Download size={15} strokeWidth={2} /> Yüklə (PDF)
                </button>
              </div>
            ))}
          </div>
        ),
    },
    {
      key: 'settings',
      label: 'Ayarlar',
      icon: Settings,
      content: (
        <form onSubmit={handleSaveSettings} className="flex max-w-lg flex-col gap-4">
          <Input
            label="Ad Soyad"
            required
            value={settingsForm.full_name}
            onChange={(e) => updateSettings('full_name', e.target.value)}
          />
          <Input
            label="Telefon"
            type="tel"
            value={settingsForm.phone}
            onChange={(e) => updateSettings('phone', e.target.value)}
            placeholder="+994 xx xxx xx xx"
          />
          <Input
            label="Doğum tarixi"
            type="date"
            value={settingsForm.birth_date}
            onChange={(e) => updateSettings('birth_date', e.target.value)}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-main">Haqqımda</label>
            <textarea
              rows={4}
              value={settingsForm.bio}
              onChange={(e) => updateSettings('bio', e.target.value)}
              className="resize-none rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-text-main outline-none transition focus:border-primary"
              placeholder="Özünüz haqqında qısa məlumat..."
            />
          </div>

          {settingsError && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {settingsError}
            </div>
          )}
          {settingsSaved && (
            <div className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
              Məlumatlar yadda saxlanıldı.
            </div>
          )}

          <Button type="submit" disabled={settingsSaving} className="self-start">
            {settingsSaving ? 'Saxlanılır...' : 'Saxla'}
          </Button>
        </form>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Profile header */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <Avatar name={profile?.full_name} size="xl" />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-text-main">
                {profile?.full_name ?? 'İstifadəçi'}
              </h1>
              <Badge variant="primary">
                {roleLabelMap[profile?.role] ?? 'İstifadəçi'}
              </Badge>
            </div>
            <p className="mt-1 text-text-secondary">{user?.email}</p>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-text-secondary">
              <Calendar size={14} strokeWidth={2} /> Üzv olma:&nbsp;
              {user?.created_at
                ? new Date(user.created_at).toLocaleDateString('az-AZ')
                : '—'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold text-primary">{stats.total * 10}</p>
            <p className="text-sm text-text-secondary">XP balı</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-xl border border-border bg-card p-5">
        <Tabs tabs={tabs} />
      </div>
    </div>
  )
}
