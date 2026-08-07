import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FileText, Video, Image, Link2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const TYPE_ICONS = { pdf: FileText, video: Video, image: Image, link: Link2 }
const TYPE_LABELS = { pdf: 'PDF', video: 'Video', image: 'Şəkil', link: 'Link' }
const FILE_TYPES = ['pdf', 'image']
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

function formatFileSize(bytes) {
  if (!bytes) return ''
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(1)} MB`
}

export default function InstructorLessonMaterials() {
  const { lessonId } = useParams()
  const [lesson, setLesson] = useState(null)
  const [materials, setMaterials] = useState([])
  const [signedUrls, setSignedUrls] = useState({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  const [type, setType] = useState('pdf')
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  async function fetchData() {
    setLoading(true)

    const { data: lessonData } = await supabase
      .from('lessons')
      .select('id, title, course_id')
      .eq('id', lessonId)
      .single()
    setLesson(lessonData)

    const { data: materialsData } = await supabase
      .from('materials')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('order_num', { ascending: true })
    setMaterials(materialsData ?? [])

    const fileMaterials = (materialsData ?? []).filter((m) => FILE_TYPES.includes(m.type))
    if (fileMaterials.length > 0) {
      const entries = await Promise.all(
        fileMaterials.map(async (m) => {
          const { data } = await supabase.storage
            .from('materials')
            .createSignedUrl(m.file_url, 3600)
          return [m.id, data?.signedUrl ?? null]
        })
      )
      setSignedUrls(Object.fromEntries(entries))
    } else {
      setSignedUrls({})
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId])

  function resetForm() {
    setType('pdf')
    setTitle('')
    setUrl('')
    setFile(null)
    setProgress(0)
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!title) {
      setError('Başlıq tələb olunur.')
      return
    }

    const isFileType = FILE_TYPES.includes(type)

    if (isFileType && !file) {
      setError('Fayl seçilməlidir.')
      return
    }
    if (!isFileType && !url) {
      setError('URL tələb olunur.')
      return
    }
    if (isFileType && file.size > MAX_FILE_SIZE) {
      setError('Fayl 50MB-dan böyük ola bilməz.')
      return
    }

    setUploading(true)
    setProgress(0)

    let fileUrl = url
    let fileSize = null

    if (isFileType) {
      const path = `${lessonId}/${crypto.randomUUID()}-${file.name}`
      // supabase-js storage upload doesn't expose real byte progress, so we
      // show an indeterminate pulse while the request is in flight.
      setProgress(30)
      const { error: uploadError } = await supabase.storage
        .from('materials')
        .upload(path, file, { contentType: file.type })
      setProgress(90)

      if (uploadError) {
        setUploading(false)
        setError('Fayl yüklənmədi. Yenidən cəhd edin.')
        return
      }
      fileUrl = path
      fileSize = file.size
    }

    const orderNum = materials.length

    const { error: insertError } = await supabase.from('materials').insert({
      lesson_id: lessonId,
      type,
      title,
      file_url: fileUrl,
      file_size: fileSize,
      order_num: orderNum,
    })

    setProgress(100)
    setUploading(false)

    if (insertError) {
      setError('Material saxlanılmadı. Yenidən cəhd edin.')
      return
    }

    resetForm()
    fetchData()
  }

  async function handleDelete(material) {
    if (!window.confirm(`"${material.title}" materialını silmək istədiyinizə əminsiniz?`)) return
    setBusyId(material.id)

    if (FILE_TYPES.includes(material.type)) {
      await supabase.storage.from('materials').remove([material.file_url])
    }
    await supabase.from('materials').delete().eq('id', material.id)

    setBusyId(null)
    fetchData()
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-text-secondary">Yüklənir...</p>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <h1 className="text-xl font-bold text-text-main">Dərs tapılmadı</h1>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-text-main sm:text-3xl">{lesson.title}</h1>
      <p className="mt-1 text-text-secondary">Dərs materiallarını idarə edin</p>

      <div className="mt-8 rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-bold text-text-main">Yeni material əlavə et</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary">Tip</label>
              <select
                value={type}
                onChange={(e) => {
                  setType(e.target.value)
                  setFile(null)
                  setUrl('')
                }}
                className="rounded-lg border border-border bg-input px-3 py-2.5 text-text-main outline-none focus:border-primary"
              >
                <option value="pdf">PDF</option>
                <option value="video">Video (YouTube)</option>
                <option value="image">Şəkil</option>
                <option value="link">Link</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary">Başlıq</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-lg border border-border bg-input px-3 py-2.5 text-text-main outline-none focus:border-primary"
              />
            </div>
          </div>

          {FILE_TYPES.includes(type) ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary">
                Fayl ({type === 'pdf' ? 'PDF' : 'JPG/PNG'}, maks. 50MB)
              </label>
              <input
                type="file"
                accept={type === 'pdf' ? 'application/pdf' : 'image/*'}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="rounded-lg border border-border bg-input px-3 py-2.5 text-text-main outline-none file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-white"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary">
                {type === 'video' ? 'YouTube linki' : 'URL'}
              </label>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={
                  type === 'video' ? 'https://youtube.com/watch?v=...' : 'https://...'
                }
                className="rounded-lg border border-border bg-input px-3 py-2.5 text-text-main outline-none focus:border-primary"
              />
            </div>
          )}

          {uploading && (
            <div className="h-2 w-full overflow-hidden rounded-full bg-bg">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={uploading}
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {uploading ? 'Yüklənir...' : 'Material əlavə et'}
          </button>
        </form>
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-lg font-bold text-text-main">
          Mövcud materiallar ({materials.length})
        </h2>
        {materials.length === 0 ? (
          <p className="text-text-secondary">Hələ material əlavə edilməyib.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {materials.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {(() => {
                    const TypeIcon = TYPE_ICONS[m.type]
                    return TypeIcon ? <TypeIcon size={18} strokeWidth={2} className="shrink-0 text-text-secondary" /> : null
                  })()}
                  <div className="min-w-0">
                    <a
                      href={FILE_TYPES.includes(m.type) ? signedUrls[m.id] ?? '#' : m.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-sm font-medium text-text-main hover:text-primary"
                    >
                      {m.title}
                    </a>
                    <p className="text-xs text-text-secondary">
                      {TYPE_LABELS[m.type]}
                      {m.file_size ? ` · ${formatFileSize(m.file_size)}` : ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(m)}
                  disabled={busyId === m.id}
                  className="shrink-0 rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-medium text-danger transition hover:bg-danger/10 disabled:opacity-50"
                >
                  {busyId === m.id ? 'Silinir...' : 'Sil'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-10 text-center">
        <Link to="/instructor/lessons" className="text-sm font-medium text-primary hover:underline">
          ← Dərslərə qayıt
        </Link>
      </div>
    </div>
  )
}
