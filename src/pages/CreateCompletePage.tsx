import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Button } from '../components/ui/Button'
import { formatDateTime } from '../lib/format'

type CreatedRoom = {
  participantToken: string
  adminToken: string
  expiresAt: string
  roomName: string
  eventAt: string
}

export default function CreateCompletePage() {
  const navigate = useNavigate()
  const [room, setRoom] = useState<CreatedRoom | null>(null)
  const [copiedParticipant, setCopiedParticipant] = useState(false)
  const [copiedAdmin, setCopiedAdmin] = useState(false)

  useEffect(() => {
    const raw = sessionStorage.getItem('createdRoom')
    if (!raw) {
      navigate('/', { replace: true })
      return
    }
    setRoom(JSON.parse(raw) as CreatedRoom)
  }, [navigate])

  if (!room) return null

  const origin = window.location.origin
  const participantUrl = `${origin}/room/${room.participantToken}`
  const adminUrl = `${origin}/admin/${room.adminToken}`

  async function copyToClipboard(text: string, type: 'participant' | 'admin') {
    await navigator.clipboard.writeText(text)
    if (type === 'participant') {
      setCopiedParticipant(true)
      setTimeout(() => setCopiedParticipant(false), 2000)
    } else {
      setCopiedAdmin(true)
      setTimeout(() => setCopiedAdmin(false), 2000)
    }
  }

  function shareToLine() {
    window.open(
      `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(participantUrl)}`,
      '_blank',
    )
  }

  return (
    <>
      <Helmet>
        <title>ルーム作成完了 | 飲み会タイマー</title>
        <meta name="description" content="ルームを作成しました。参加者にURLをシェアしましょう。" />
      </Helmet>
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-md mx-auto flex flex-col gap-4">
          <h1 className="text-2xl font-bold text-gray-900">作成完了！</h1>

          <div className="bg-white p-5 rounded-xl shadow-sm flex flex-col gap-2">
            <p className="text-lg font-semibold text-gray-900">{room.roomName}</p>
            <p className="text-sm text-gray-600">開催日時: {formatDateTime(room.eventAt)}</p>
            <p className="text-sm text-gray-500">有効期限: {formatDateTime(room.expiresAt)} まで</p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm flex flex-col gap-3">
            <p className="font-medium text-gray-800">参加者向けURL</p>
            <p className="text-sm text-indigo-600 break-all bg-indigo-50 p-2 rounded">{participantUrl}</p>
            <Button onClick={() => copyToClipboard(participantUrl, 'participant')}>
              {copiedParticipant ? 'コピーしました！' : 'URLをコピー'}
            </Button>
            <Button variant="secondary" onClick={shareToLine}>
              LINEでシェア
            </Button>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm flex flex-col gap-3">
            <p className="font-medium text-gray-800">幹事向けURL（結果管理）</p>
            <p className="text-sm text-gray-500 text-xs">このURLは自分だけで保管してください</p>
            <p className="text-sm text-indigo-600 break-all bg-indigo-50 p-2 rounded">{adminUrl}</p>
            <Button variant="secondary" onClick={() => copyToClipboard(adminUrl, 'admin')}>
              {copiedAdmin ? 'コピーしました！' : '幹事URLをコピー'}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
