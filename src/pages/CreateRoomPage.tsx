import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'

type FormData = {
  name: string
  event_at: string
  location: string
  nearest_station: string
}

type FormErrors = Partial<Record<keyof FormData, string>>

export default function CreateRoomPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<FormData>({ name: '', event_at: '', location: '', nearest_station: '' })
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function validate(): FormErrors {
    const errs: FormErrors = {}
    if (!form.name.trim()) errs.name = '飲み会名を入力してください'
    else if (form.name.length > 50) errs.name = '50文字以内で入力してください'
    if (!form.event_at) errs.event_at = '開催日時を入力してください'
    else if (new Date(form.event_at) <= new Date()) errs.event_at = '開催日時は現在以降を指定してください'
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
            event_at: new Date(form.event_at).toISOString(),
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
          eventAt: new Date(form.event_at).toISOString(),
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
            <Input
              id="event_at"
              label="開催日時"
              type="datetime-local"
              value={form.event_at}
              onChange={(v) => setForm((f) => ({ ...f, event_at: v }))}
              onBlur={() => handleBlur('event_at')}
              required
              error={errors.event_at}
            />
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
