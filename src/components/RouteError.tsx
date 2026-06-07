import { useRouteError } from 'react-router-dom'
import { Button } from './ui/Button'

export default function RouteError() {
  const error = useRouteError() as { status?: number }
  const isNotFound = error?.status === 404

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-sm w-full">
        <p className="text-lg font-medium text-gray-800">
          {isNotFound
            ? 'このURLは無効です。URLをご確認ください'
            : 'エラーが発生しました'}
        </p>
        <div className="mt-6">
          <Button onClick={() => (window.location.href = '/')}>トップページへ</Button>
        </div>
      </div>
    </div>
  )
}
