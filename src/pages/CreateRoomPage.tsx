import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'

type FormData = {
  name: string
  event_date: string
  event_time: string
  location: string
  nearest_station: string
}

type FormErrors = Partial<Record<keyof FormData, string>>

const TIME_OPTIONS = Array.from({ length: 26 }, (_, i) => {
  const totalMinutes = 11 * 60 + i * 30
  const h = Math.floor(totalMinutes / 60).toString().padStart(2, '0')
  const m = (totalMinutes % 60).toString().padStart(2, '0')
  return `${h}:${m}`
})

export default function CreateRoomPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<FormData>({ name: '', event_date: '', event_time: '', location: '', nearest_station: '' })
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function validate(): FormErrors {
    const errs: FormErrors = {}
    if (!form.name.trim()) errs.name = '飲み会名を入力してください'
    else if (form.name.length > 50) errs.name = '50文字以内で入力してください'
    if (!form.event_date) errs.event_date = '開催日を入力してください'
    if (!form.event_time) errs.event_time = '開催時間を選択してください'
    else if (form.event_date) {
      const combined = new Date(`${form.event_date}T${form.event_time}`)
      if (combined <= new Date()) errs.event_time = '開催日時は現在以降を指定してください'
    }
    if (form.location.length > 100) errs.location = '100文字以内で入力してください'
    if (form.nearest_station.length > 50) errs.nearest_station = '50文字以内で入力してください'
    return errs
  }

  function handleBlur(field: keyof FormData) {
    const errs = validate()
    setErrors((prev) => ({ ...prev, [field]: errs[field] }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError('')
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setIsSubmitting(true)
    const eventAt = new Date(`${form.event_date}T${form.event_time}`).toISOString()
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-room`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            name: form.name.trim(),
            event_at: eventAt,
            location: form.location.trim() || undefined,
            nearest_station: form.nearest_station.trim() || undefined,
          }),
        },
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setSubmitError(
          res.status >= 500
            ? 'サーバーエラーが発生しました。時間をおいて再試行してください'
            : (data?.error?.message ?? '通信エラーが発生しました。もう一度お試しください'),
        )
        return
      }
      const { participant_token, admin_token, expires_at } = await res.json()
      sessionStorage.setItem(
        'createdRoom',
        JSON.stringify({
          participantToken: participant_token,
          adminToken: admin_token,
          expiresAt: expires_at,
          roomName: form.name.trim(),
          eventAt,
        }),
      )
      navigate('/complete')
    } catch {
      setSubmitError('通信エラーが発生しました。もう一度お試しください')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Helmet>
        <title>飲み会タイマー - 匿名で気軽に帰宅希望を伝えよう</title>
        <meta name="description" content="飲み会で帰宅希望時間・二次会参加を匿名で投票。幹事が全体の意向を把握できるWebサービスです。" />
        <meta property="og:title" content="飲み会タイマー - 匿名投票で帰宅希望を伝えよう" />
        <meta property="og:description" content="幹事・参加者が使える飲み会向け匿名投票サービス" />
        <meta property="og:url" content={window.location.origin + '/'} />
      </Helmet>
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">アンケートを作成</h1>
          {submitError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {submitError}
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-white p-5 rounded-xl shadow-sm">
            <Input
              id="name"
              label="飲み会名"
              value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
              onBlur={() => handleBlur('name')}
              required
              error={errors.name}
              placeholder="例: 営業部歓迎会"
            />
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">
                開催日時<span className="text-red-500 ml-1">*</span>
              </span>
              <div className="flex gap-2">
                <input
                  id="event_date"
                  type="date"
                  value={form.event_date}
                  onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))}
                  onBlur={() => handleBlur('event_date')}
                  className={`flex-1 px-3 py-2 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px] ${
                    errors.event_date ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <select
                  id="event_time"
                  value={form.event_time}
                  onChange={(e) => setForm((f) => ({ ...f, event_time: e.target.value }))}
                  onBlur={() => handleBlur('event_time')}
                  className={`w-28 px-3 py-2 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px] ${
                    errors.event_time ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">時間</option>
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              {errors.event_date && <p className="text-sm text-red-500">{errors.event_date}</p>}
              {errors.event_time && <p className="text-sm text-red-500">{errors.event_time}</p>}
            </div>
            <Input
              id="location"
              label="開催場所"
              value={form.location}
              onChange={(v) => setForm((f) => ({ ...f, location: v }))}
              onBlur={() => handleBlur('location')}
              error={errors.location}
              placeholder="例: 渋谷 〇〇居酒屋"
            />
            <Input
              id="nearest_station"
              label="最寄駅"
              value={form.nearest_station}
              onChange={(v) => setForm((f) => ({ ...f, nearest_station: v }))}
              onBlur={() => handleBlur('nearest_station')}
              error={errors.nearest_station}
              placeholder="例: 渋谷駅"
            />
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '作成中...' : 'アンケートを作成する'}
            </Button>
          </form>
        </div>
      </div>
    </>
  )
}
