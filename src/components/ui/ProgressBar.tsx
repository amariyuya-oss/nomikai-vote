type ProgressBarProps = {
  label: string
  count: number
  total: number
}

export function ProgressBar({ label, count, total }: ProgressBarProps) {
  const percent = total === 0 ? 0 : Math.round((count / total) * 100)
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-800">{label}</span>
        <span className="text-gray-500">{count}票（{percent}%）</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
