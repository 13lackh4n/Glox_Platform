import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Landing() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCourses() {
      const { data } = await supabase
        .from('courses')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      setCourses(data ?? [])
      setLoading(false)
    }
    fetchCourses()
  }, [])

  return (
    <div>
      <section className="mx-auto max-w-6xl px-4 py-20 text-center">
        <h1 className="text-4xl font-bold text-text-main sm:text-5xl">
          <span className="text-primary">Glox</span> <span className="text-secondary">Platform</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-text-secondary">
          Elektronika sahəsində peşəkar bacarıqlar qazanmaq üçün çox-kurslu
          öyrənmə və test platforması.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            to="/register"
            className="rounded-lg bg-primary px-6 py-3 font-medium text-white transition hover:opacity-90"
          >
            İndi Başla
          </Link>
          <Link
            to="/courses"
            className="rounded-lg border border-white/10 px-6 py-3 font-medium text-text-main transition hover:bg-card"
          >
            Kursları Gör
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <h2 className="mb-6 text-2xl font-bold text-text-main">Kurslar</h2>
        {loading ? (
          <p className="text-text-secondary">Yüklənir...</p>
        ) : courses.length === 0 ? (
          <p className="text-text-secondary">Hələ heç bir kurs əlavə edilməyib.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <div
                key={course.id}
                className="rounded-xl border border-white/10 bg-card p-6 transition hover:border-primary/50"
              >
                <h3 className="text-lg font-semibold text-text-main">{course.title}</h3>
                <p className="mt-2 text-sm text-text-secondary line-clamp-3">
                  {course.description}
                </p>
                <p className="mt-4 text-sm text-secondary">{course.duration_months} ay</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
