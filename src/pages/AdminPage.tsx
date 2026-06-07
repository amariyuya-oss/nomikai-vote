import { useState, useEffect } from 'react'
import { useLoaderData, LoaderFunctionArgs } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import VoteResults from '../components/VoteResults'
import RoomExpired from '../components/RoomExpired'
import type { Room, VoteReturnTimeChoice, VoteAfterpartyChoice } from '../types'

type LoaderData = {
  room: Room
  initialReturnTimeVotes: { choice: VoteReturnTimeChoice }[]
  initialAfterpartyVotes: { choice: VoteAfterpartyChoice }[]
}

export async function loader({ params }: LoaderFunctionArgs): Promise<LoaderData> {
  const { data: room, error } = await supabase
    .from('rooms')
    .select('id, name, event_at, location, nearest_station, expires_at')
    .eq('admin_token', params.adminToken)
    .single()
  if (error || !room) throw new Response('Not Found', { status: 404 })

  const [{ data: rtVotes }, { data: apVotes }] = await Promise.all([
    supabase.from('votes_return_time').select('choice').eq('room_id', room.id),
    supabase.from('votes_afterparty').select('choice').eq('room_id', room.id),
  ])

  return {
    room: room as Room,
    initialReturnTimeVotes: (rtVotes ?? []) as { choice: VoteReturnTimeChoice }[],
    initialAfterpartyVotes: (apVotes ?? []) as { choice: VoteAfterpartyChoice }[],
  }
}

export default function AdminPage() {
  const { room, initialReturnTimeVotes, initialAfterpartyVotes } = useLoaderData() as LoaderData

  const [returnTimeVotes, setReturnTimeVotes] = useState(initialReturnTimeVotes)
  const [afterpartyVotes, setAfterpartyVotes] = useState(initialAfterpartyVotes)
  const [isUpdating, setIsUpdating] = useState(false)
  const [realtimeError, setRealtimeError] = useState(false)
  const [fetchError, setFetchError] = useState(false)

  const isExpired = new Date(room.expires_at) <= new Date()

  useEffect(() => {
    const channel = supabase
      .channel(`admin-${room.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'votes_return_time', filter: `room_id=eq.${room.id}` },
        async () => {
          setIsUpdating(true)
          const { data } = await supabase.from('votes_return_time').select('choice').eq('room_id', room.id)
          if (data) setReturnTimeVotes(data as { choice: VoteReturnTimeChoice }[])
          setIsUpdating(false)
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'votes_afterparty', filter: `room_id=eq.${room.id}` },
        async () => {
          setIsUpdating(true)
          const { data } = await supabase.from('votes_afterparty').select('choice').eq('room_id', room.id)
          if (data) setAfterpartyVotes(data as { choice: VoteAfterpartyChoice }[])
          setIsUpdating(false)
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') setRealtimeError(true)
        if (status === 'SUBSCRIBED') setRealtimeError(false)
      })

    return () => { supabase.removeChannel(channel) }
  }, [room.id])

  async function handleManualRefresh() {
    setFetchError(false)
    setIsUpdating(true)
    const [rtData, apData] = await Promise.all([
      supabase.from('votes_return_time').select('choice').eq('room_id', room.id),
      supabase.from('votes_afterparty').select('choice').eq('room_id', room.id),
    ])
    if (rtData.data) setReturnTimeVotes(rtData.data as { choice: VoteReturnTimeChoice }[])
    else setFetchError(true)
    if (apData.data) setAfterpartyVotes(apData.data as { choice: VoteAfterpartyChoice }[])
    else setFetchError(true)
    setIsUpdating(false)
  }

  if (isExpired) return <RoomExpired />

  return (
    <>
      <Helmet>
        <title>{room.name} - 幹事管理 | 飲み会タイマー</title>
        <meta name="description" content={`${room.name}の投票結果です。帰宅希望時間・二次会参加意向をリアルタイムで確認できます。`} />
      </Helmet>
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-md mx-auto flex flex-col gap-4">
          <div>
            <p className="text-xs text-indigo-600 font-medium mb-1">幹事管理画面</p>
            <h1 className="text-xl font-bold text-gray-900">{room.name}</h1>
          </div>

          {realtimeError && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm flex items-center justify-between">
              <span>リアルタイム更新が停止しています</span>
              <button onClick={handleManualRefresh} className="ml-2 text-indigo-600 underline text-sm">
                手動更新
              </button>
            </div>
          )}

          {fetchError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
              <span>データの取得に失敗しました。再読み込みしてください</span>
              <button onClick={handleManualRefresh} className="ml-2 text-indigo-600 underline text-sm">
                再読み込み
              </button>
            </div>
          )}

          <div className="bg-white p-5 rounded-xl shadow-sm">
            <VoteResults returnTimeVotes={returnTimeVotes} afterpartyVotes={afterpartyVotes} />
          </div>

          <Button variant="secondary" onClick={handleManualRefresh}>
            手動で更新する
          </Button>
        </div>

        {isUpdating && (
          <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-full px-3 py-1 text-xs text-gray-600 shadow">
            🔄 更新中
          </div>
        )}
      </div>
    </>
  )
}
