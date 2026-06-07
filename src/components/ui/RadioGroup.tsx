type Option = {
  label: string
  value: string
}

type RadioGroupProps = {
  name: string
  options: Option[]
  value: string
  onChange: (value: string) => void
  error?: string
}

export function RadioGroup({ name, options, value, onChange, error }: RadioGroupProps) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((opt) => (
        <label
          key={opt.value}
          className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer min-h-[44px] has-[:checked]:border-indigo-600 has-[:checked]:bg-indigo-50"
        >
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="accent-indigo-600"
          />
          <span className="text-base">{opt.label}</span>
        </label>
      ))}
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  )
}
