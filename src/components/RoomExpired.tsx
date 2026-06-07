import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Button } from './ui/Button'

export default function RoomExpired() {
  const navigate = useNavigate()
  return (
    <>
      <Helmet>
        <title>このルームは終了しました | 飲み会タイマー</title>
        <meta name="description" content="この飲み会ルームの投票受付は終了しました。新しいルームを作成できます。" />
      </Helmet>
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-sm w-full">
          <p className="text-lg font-medium text-gray-800">このルームは終了しました</p>
          <p className="text-sm text-gray-500 mt-2">投票受付期間が終了しています</p>
          <div className="mt-6">
            <Button onClick={() => navigate('/')}>新しいルームを作る</Button>
          </div>
        </div>
      </div>
    </>
  )
}
