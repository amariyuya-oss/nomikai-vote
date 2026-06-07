import { useState, useEffect } from 'react'
import { useLoaderData, useNavigate, useParams, LoaderFunctionArgs } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { supabase } from '../lib/supabase'
import { formatDateTime } from '../lib/format'
import { RadioGroup } from '../components/ui/RadioGroup'
import { Button } from '../components/ui/Button'
import RoomExpired from '../components/RoomExpired'
import type { Room, VoteReturnTimeChoice, VoteAfterpartyChoice } from '../types'

const RETURN_TIME_OPTIONS = [
  { label: '21:00', value: '21:00' },
  { label: '21:30', value: '21:30' },
  { label: '22:00', value: '22:00' },
  { label: '22:30', value: '22:30' },
  { label: '23:00', value: '23:00' },
  { label: '終電まで', value: '終電まで' },
  { label: '未定', value: '未定' },
]
const AFTERPARTY_OPTIONS = [
  { label: '行く', value: '行く' },
  { label: '行かない', value: '行かない' },
  { label: '未定', value: '未定' },
]

export async function loader({ params }: LoaderFunctionArgs): Promise<Room> {
  const { data, error } = await supabase
    .from('rooms')
    .select('id, name, event_at, location, nearest_station, expires_at')
    .eq('participant_token', params.participantToken)
    .single()
  if (error || !data) throw new Response('Not Found', { status: 404 })
  return data as Room
}

export default function VotePage() {
  const room = useLoaderData() as Room
  const navigate = useNavigate()
  const { participantToken } = useParams() as { participantToken: string }

  const [checked, setChecked] = useState(false)
  const [returnTime, setReturnTime] = useState('')
  const [afterparty, setAfterparty] = useState('')
  const [returnTimeError, setReturnTimeError] = useState('')
  const [afterpartyError, setAfterpartyError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const voted = localStorage.getItem(`voted_${room.id}`)
    if (voted === 'true') {
      navigate(`/room/${participantToken}/results`, { replace: true })
    } else {
      setChecked(true)
    }
  }, [room.id, participantToken, navigate])

  if (!checked) return null

  const isExpired = new Date(room.expires_at) <= new Date()
  if (isExpired) return <RoomExpired />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError('')
    let valid = true
    if (!returnTime) { setReturnTimeError('帰りたい時間を選んでください'); valid = false }
    else setReturnTimeError('')
    if (!afterparty) { setAfterpartyError('二次会の参加意向を選んでください'); valid = false }
    else setAfterpartyError('')
    if (!valid) return

    setIsSubmitting(true)
    try {
      const { error: rtError } = await supabase
        .from('votes_return_time')
        .insert({ room_id: room.id, choice: returnTime as VoteReturnTimeChoice })
      if (rtError) {
        setSubmitError(
          rtError.code === '42501'
            ? 'このルームの投票受付は終了しました'
            : '投票に失敗しました。もう一度お試しください',
        )
        return
      }

      const { error: apError } = await supabase
        .from('votes_afterparty')
        .insert({ room_id: room.id, choice: afterparty as VoteAfterpartyChoice })
      if (apError) {
        setSubmitError(
          apError.code === '42501'
            ? 'このルームの投票受付は終了しました'
            : '投票に失敗しました。もう一度お試しください',
        )
        return
      }

      localStorage.setItem(`voted_${room.id}`, 'true')
      navigate(`/room/${participantToken}/done`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Helmet>
        <title>{room.name} | 飲み会タイマー</title>
        <meta name="description" content={`${room.name}の匿名投票に参加しましょう。帰宅希望時間と二次会参加を選んで投票できます。`} />
        <meta property="og:title" content={`${room.name}に参加しよう`} />
        <meta property="og:description" content="匿名で帰宅希望時間・二次会参加を投票できます" />
        <meta property="og:url" content={window.location.href} />
      </Helmet>
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-md mx-auto flex flex-col gap-4">
          <div className="bg-white p-5 rounded-xl shadow-sm">
            <h1 className="text-xl font-bold text-gray-900">{room.name}</h1>
            <p className="text-sm text-gray-600 mt-1">{formatDateTime(room.event_at)}</p>
            {room.location && <p className="text-sm text-gray-600">{room.location}</p>}
          </div>

          {submitError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="bg-white p-5 rounded-xl shadow-sm flex flex-col gap-3">
              <h2 className="font-semibold text-gray-800">帰りたい時間は？</h2>
              <RadioGroup
                name="returnTime"
                options={RETURN_TIME_OPTIONS}
                value={returnTime}
                onChange={(v) => { setReturnTime(v); setReturnTimeError('') }}
                error={returnTimeError}
              />
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm flex flex-col gap-3">
              <h2 className="font-semibold text-gray-800">二次会は？</h2>
              <RadioGroup
                name="afterparty"
                options={AFTERPARTY_OPTIONS}
                value={afterparty}
                onChange={(v) => { setAfterparty(v); setAfterpartyError('') }}
                error={afterpartyError}
              />
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '送信中...' : '投票する'}
            </Button>
          </form>
        </div>
      </div>
    </>
  )
}
