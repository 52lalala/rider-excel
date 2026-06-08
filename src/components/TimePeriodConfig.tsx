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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">时段配置</label>
        <button
          type="button"
          onClick={addPeriod}
          disabled={disabled}
          className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
        >
          + 添加时段
        </button>
      </div>
      {periods.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="time"
            value={p.start}
            onChange={e => updatePeriod(i, 'start', e.target.value)}
            disabled={disabled}
            className="border border-gray-300 rounded px-2 py-1 text-sm w-32 disabled:bg-gray-100"
          />
          <span className="text-gray-400">-</span>
          <input
            type="time"
            value={p.end}
            onChange={e => updatePeriod(i, 'end', e.target.value)}
            disabled={disabled}
            className="border border-gray-300 rounded px-2 py-1 text-sm w-32 disabled:bg-gray-100"
          />
          {periods.length > 1 && (
            <button
              type="button"
              onClick={() => removePeriod(i)}
              disabled={disabled}
              className="text-red-400 hover:text-red-600 text-sm disabled:text-gray-300"
            >
              删除
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
