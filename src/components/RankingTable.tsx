'use client'

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

  return (
    <div className="overflow-x-auto">
      <div className="text-sm text-gray-500 mb-2">
        共 {data.totalOrders} 条订单 · {data.riders.length} 位骑手
      </div>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-4 py-3 text-center font-semibold text-gray-500 border-b border-gray-200 w-16">排名</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-500 border-b border-gray-200">骑手</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-500 border-b border-gray-200">总单量</th>
            {periodKeys.map(key => (
              <th key={key} className="px-4 py-3 text-center font-semibold text-gray-500 border-b border-gray-200 whitespace-nowrap">
                {key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.riders.map((rider, idx) => (
            <tr key={rider.name} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}>
              <td className="px-4 py-3 border-b border-gray-100 text-center text-gray-400 font-medium">{idx + 1}</td>
              <td className="px-4 py-3 border-b border-gray-100 text-center font-medium text-gray-800">{rider.name}</td>
              <td className="px-4 py-3 border-b border-gray-100 text-center font-bold text-blue-600">{rider.totalOrders}</td>
              {periodKeys.map(key => (
                <td key={key} className="px-4 py-3 border-b border-gray-100 text-center text-gray-700">{rider.periodOrders[key] ?? 0}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
