'use client'

import type { TimePeriod } from '@/lib/types'

interface Props {
  periods: TimePeriod[]
  onChange: (periods: TimePeriod[]) => void
  disabled?: boolean
}

export default function TimePeriodConfig({ periods, onChange, disabled }: Props) {
  const updatePeriod = (index: number, field: 'start' | 'end', value: string) => {
    const next = periods.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    onChange(next)
  }

  const addPeriod = () => {
    onChange([...periods, { start: '', end: '' }])
  }

  const removePeriod = (index: number) => {
    if (periods.length <= 1) return
    onChange(periods.filter((_, i) => i !== index))
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-sm text-gray-500 font-medium shrink-0">时段</span>
      {periods.map((p, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <input
            type="time"
            value={p.start}
            onChange={e => updatePeriod(i, 'start', e.target.value)}
            disabled={disabled}
            className="border border-gray-200 rounded-md px-2 py-1.5 text-sm w-28 bg-gray-50 hover:bg-white focus:bg-white focus:border-blue-400 focus:outline-none transition-colors disabled:opacity-50"
          />
          <span className="text-gray-300 text-sm">—</span>
          <input
            type="time"
            value={p.end}
            onChange={e => updatePeriod(i, 'end', e.target.value)}
            disabled={disabled}
            className="border border-gray-200 rounded-md px-2 py-1.5 text-sm w-28 bg-gray-50 hover:bg-white focus:bg-white focus:border-blue-400 focus:outline-none transition-colors disabled:opacity-50"
          />
          {periods.length > 1 && (
            <button
              type="button"
              onClick={() => removePeriod(i)}
              disabled={disabled}
              className="text-gray-300 hover:text-red-400 text-sm leading-none transition-colors disabled:opacity-30"
            >
              ✕
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={addPeriod}
        disabled={disabled}
        className="text-sm text-blue-500 hover:text-blue-700 disabled:text-gray-300 transition-colors"
      >
        + 添加
      </button>
    </div>
  )
}
