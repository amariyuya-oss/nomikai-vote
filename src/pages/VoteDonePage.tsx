import { useEffect, useState } from 'react'
import { useLoaderData, useNavigate, useParams, LoaderFunctionArgs } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import AdBanner from '../components/AdBanner'
import RoomExpired from '../components/RoomExpired'
import type { Room } from '../types'

export async function loader({ params }: LoaderFunctionArgs): Promise<Room> {
  const { data, error } = await supabase
    .from('rooms')
    .select('id, name, event_at, location, nearest_station, expires_at')
    .eq('participant_token', params.participantToken)
    .single()
  if (error || !data) throw new Response('Not Found', { status: 404 })
  return data as Room
}

export default function VoteDonePage() {
  const room = useLoaderData() as Room
  const navigate = useNavigate()
  const { participantToken } = useParams() as { participantToken: string }
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const voted = localStorage.getItem(`voted_${room.id}`)
    if (voted !== 'true') {
      navigate(`/room/${participantToken}`, { replace: true })
    } else {
      setChecked(true)
    }
  }, [room.id, participantToken, navigate])

  if (!checked) return null

  const isExpired = new Date(room.expires_at) <= new Date()
  if (isExpired) return <RoomExpired />

  return (
    <>
      <Helmet>
        <title>投票完了 | 飲み会タイマー</title>
        <meta name="description" content="投票が完了しました。結果はリアルタイムで更新されます。" />
      </Helmet>
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-md mx-auto flex flex-col items-center gap-6 text-center">
          <div className="bg-white p-8 rounded-xl shadow-sm w-full">
            <p className="text-2xl font-bold text-gray-900">投票しました！</p>
            <p className="text-gray-500 mt-2">みんなの回答がリアルタイムで集まっています</p>
          </div>
          <AdBanner />
          <div className="w-full">
            <Button onClick={() => navigate(`/room/${participantToken}/results`)}>
              結果を見る
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
