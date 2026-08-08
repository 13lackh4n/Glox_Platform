import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FileText, Video, Image, Link2, Paperclip } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

const TYPE_ICONS = { pdf: FileText, video: Video, image: Image, link: Link2 }
const TYPE_LABELS = { pdf: 'PDF', video: 'Video', image: 'Şəkil', link: 'Link' }
const FILE_TYPES = ['pdf', 'image']

function getYoutubeEmbedUrl(url) {
  if (!url) return null
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return `https://www.youtube.com/embed/${match[1]}`
  }
  return null
}

function MaterialItem({ material }) {
  const Icon = TYPE_ICONS[material.type] ?? Paperclip

  if (material.type === 'video') {
    const embedUrl = getYoutubeEmbedUrl(material.file_url)
    return (
      <div className="rounded-lg bg-bg p-3">
        <p className="mb-2 flex items-center gap-2 text-sm font-medium text-text-main">
          <Icon size={16} strokeWidth={2} />
          {material.title}
        </p>
        {embedUrl ? (
          <div className="aspect-video w-full overflow-hidden rounded-lg">
            <iframe
              src={embedUrl}
              title={material.title}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <a
            href={material.file_url}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-primary hover:underline"
          >
            Videoya keç →
          </a>
        )}
      </div>
    )
  }

  if (material.type === 'image') {
    return (
      <div className="rounded-lg bg-bg p-3">
        <p className="mb-2 flex items-center gap-2 text-sm font-medium text-text-main">
          <Icon size={16} strokeWidth={2} />
          {material.title}
        </p>
        <img
          src={material.file_url}
          alt={material.title}
          className="max-h-96 w-full rounded-lg object-contain"
        />
      </div>
    )
  }

  return (
    <a
      href={material.file_url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between gap-3 rounded-lg bg-bg px-3 py-2.5 text-sm text-text-main transition hover:bg-primary/10"
    >
      <span className="flex items-center gap-2">
        <Icon size={16} strokeWidth={2} />
        {material.title}
      </span>
      <span className="shrink-0 rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
        {TYPE_LABELS[material.type] ?? material.type}
      </span>
    </a>
  )
}

export default function Lessons() {
  const { courseId } = useParams()
  const { user } = useAuth()
  const [course, setCourse] = useState(null)
  const [lessons, setLessons] = useState([])
  const [materialsByLesson, setMaterialsByLesson] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError('')

      const { data: courseData } = await supabase
        .from('courses')
        .select('id, title')
        .eq('id', courseId)
        .single()
      setCourse(courseData)

      const { data: publishedLessons, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .eq('is_published', true)
        .order('order_num', { ascending: true })

      if (lessonsError) {
        setError('Dərslər yüklənərkən xəta baş verdi.')
        setLoading(false)
        return
      }

      const publishedIds = (publishedLessons ?? []).map((l) => l.id)

      // Determine which lessons the student's group can see: a lesson with
      // no lesson_group_access rows is open to everyone, otherwise the
      // student needs to be in one of the granted groups.
      let lessonsData = publishedLessons ?? []
      if (publishedIds.length > 0 && user) {
        const [{ data: myGroups }, { data: accessRows }] = await Promise.all([
          supabase.from('group_members').select('group_id').eq('user_id', user.id),
          supabase.from('lesson_group_access').select('lesson_id, group_id').in('lesson_id', publishedIds),
        ])

        const myGroupIds = new Set((myGroups ?? []).map((g) => g.group_id))
        const restrictedLessonIds = new Set((accessRows ?? []).map((a) => a.lesson_id))
        const allowedRestrictedLessonIds = new Set(
          (accessRows ?? [])
            .filter((a) => myGroupIds.has(a.group_id))
            .map((a) => a.lesson_id)
        )

        lessonsData = (publishedLessons ?? []).filter(
          (l) => !restrictedLessonIds.has(l.id) || allowedRestrictedLessonIds.has(l.id)
        )
      }

      setLessons(lessonsData)

      const lessonIds = lessonsData.map((l) => l.id)
      if (lessonIds.length > 0) {
        const { data: materialsData } = await supabase
          .from('materials')
          .select('*')
          .in('lesson_id', lessonIds)
          .order('order_num', { ascending: true })

        // The materials bucket is private, so pdf/image entries store a
        // storage path rather than a usable URL — resolve a signed URL
        // for each before rendering.
        const fileMaterials = (materialsData ?? []).filter((m) => FILE_TYPES.includes(m.type))
        const signedUrls = {}
        if (fileMaterials.length > 0) {
          const entries = await Promise.all(
            fileMaterials.map(async (m) => {
              const { data } = await supabase.storage
                .from('materials')
                .createSignedUrl(m.file_url, 3600)
              return [m.id, data?.signedUrl ?? null]
            })
          )
          entries.forEach(([id, signedUrl]) => {
            signedUrls[id] = signedUrl
          })
        }

        const grouped = {}
        ;(materialsData ?? []).forEach((m) => {
          const resolvedUrl = FILE_TYPES.includes(m.type)
            ? signedUrls[m.id] ?? m.file_url
            : m.file_url
          grouped[m.lesson_id] = [
            ...(grouped[m.lesson_id] ?? []),
            { ...m, file_url: resolvedUrl },
          ]
        })
        setMaterialsByLesson(grouped)
      }

      setLoading(false)
    }

    fetchData()
  }, [courseId, user])

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-main sm:text-3xl">
          {course?.title ?? 'Dərslər'}
        </h1>
        <p className="mt-1 text-text-secondary">Kurs dərsləri və materialları</p>
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-card" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : lessons.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center text-text-secondary">
          Hələ heç bir dərs yayımlanmayıb.
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {lessons.map((lesson, idx) => {
            const materials = materialsByLesson[lesson.id] ?? []
            return (
              <div key={lesson.id} className="rounded-xl border border-border bg-card p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-semibold text-text-main">{lesson.title}</h2>
                    {lesson.description && (
                      <p className="mt-1 text-sm text-text-secondary">{lesson.description}</p>
                    )}
                  </div>
                </div>

                {materials.length > 0 && (
                  <div className="mt-4 flex flex-col gap-2 pl-11">
                    {materials.map((m) => (
                      <MaterialItem key={m.id} material={m} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-10 text-center">
        <Link to="/dashboard" className="text-sm font-medium text-primary hover:underline">
          ← Dashboard-a qayıt
        </Link>
      </div>
    </div>
  )
}
