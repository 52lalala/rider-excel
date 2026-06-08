'use client'

import { useMemo, useState } from 'react'
import type { AnalysisResult } from '@/lib/types'

interface Props {
  data: AnalysisResult | null
  loading?: boolean
}

export default function RankingTable({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500">
        <svg className="animate-spin h-6 w-6 mr-2" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        分析中...
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-gray-400">
        请上传Excel文件并点击分析
      </div>
    )
  }

  const periodKeys = data.timePeriods.map(p => `${p.start}-${p.end}`)

  const isRestStatus = (status?: string) => !!status && /休/.test(status)

  const [showRest, setShowRest] = useState(true)

  const riders = useMemo(() => {
    if (!data) return []
    const list = data.riders
    if (showRest) return list
    return list.filter(r => !isRestStatus(r.scheduleStatus))
  }, [data, showRest])

  const toggleRest = () => setShowRest(prev => !prev)

  const scheduleInfoText = useMemo(() => {
    if (!data?.scheduleDate) return ''
    return `排班日期 ${data.scheduleDate}`
  }, [data?.scheduleDate])

  const periodCellClass = (riderScheduleStatus: string | undefined, scheduledPeriods: string[] | undefined, count: number, periodKey: string) => {
    if (!scheduledPeriods?.includes(periodKey)) return 'text-gray-700'
    if (isRestStatus(riderScheduleStatus)) return 'text-gray-400'
    return count >= 2 ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500 mb-3">
        <div>
          共 {data.totalOrders} 条订单 · {data.riders.length} 位骑手
          {scheduleInfoText ? ` · ${scheduleInfoText}` : ''}
        </div>
        <button
          type="button"
          onClick={toggleRest}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          {showRest ? '隐藏排休人员' : '显示排休人员'}
        </button>
      </div>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-4 py-3 text-center font-semibold text-gray-500 border-b border-gray-200 w-16">排名</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-500 border-b border-gray-200">骑手ID</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-500 border-b border-gray-200">骑手</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-500 border-b border-gray-200">总单量</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-500 border-b border-gray-200">排班状态</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-500 border-b border-gray-200">班次</th>
            {periodKeys.map(key => (
              <th key={key} className="px-4 py-3 text-center font-semibold text-gray-500 border-b border-gray-200 whitespace-nowrap">
                {key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {riders.map((rider, idx) => {
            const scheduledPeriods = rider.scheduledPeriods ?? []
            const scheduleStatus = rider.scheduleStatus ?? '未排班'
            const shiftLabelText = rider.shiftLabels && rider.shiftLabels.length > 0 ? rider.shiftLabels.join('、') : '—'
            return (
              <tr key={`${rider.id}-${rider.name}-${idx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}>
                <td className="px-4 py-3 border-b border-gray-100 text-center text-gray-400 font-medium">{idx + 1}</td>
                <td className="px-4 py-3 border-b border-gray-100 text-center text-gray-500 font-mono">{rider.id}</td>
                <td className="px-4 py-3 border-b border-gray-100 text-center font-medium text-gray-800">{rider.name}</td>
                <td className="px-4 py-3 border-b border-gray-100 text-center font-bold text-blue-600">{rider.totalOrders}</td>
                <td className="px-4 py-3 border-b border-gray-100 text-center text-gray-600">{scheduleStatus}</td>
                <td className="px-4 py-3 border-b border-gray-100 text-center text-gray-600">{shiftLabelText}</td>
                {periodKeys.map(key => {
                  const count = rider.periodOrders[key] ?? 0
                  const cellClass = periodCellClass(scheduleStatus, scheduledPeriods, count, key)
                  return (
                    <td key={key} className={`px-4 py-3 border-b border-gray-100 text-center ${cellClass}`}>
                      {count}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
