'use client'

import { useState, useCallback, useEffect } from 'react'
import FileUpload from '@/components/FileUpload'
import TimePeriodConfig from '@/components/TimePeriodConfig'
import RankingTable from '@/components/RankingTable'
import HistoryPanel from '@/components/HistoryPanel'
import type { TimePeriod, AnalysisResult } from '@/lib/types'

const DEFAULT_PERIODS: TimePeriod[] = [
  { start: '10:30', end: '13:30' },
  { start: '17:30', end: '20:30' },
]

const LS_KEY_PERIODS = 'rider-excel-periods'
const LS_KEY_RESULT = 'rider-excel-result'

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null)
  const [periods, setPeriods] = useState<TimePeriod[]>(DEFAULT_PERIODS)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setPeriods(loadFromStorage(LS_KEY_PERIODS, DEFAULT_PERIODS))
    setResult(loadFromStorage<AnalysisResult | null>(LS_KEY_RESULT, null))
  }, [])

  useEffect(() => {
    localStorage.setItem(LS_KEY_PERIODS, JSON.stringify(periods))
  }, [periods])

  useEffect(() => {
    if (result) {
      localStorage.setItem(LS_KEY_RESULT, JSON.stringify(result))
    } else {
      localStorage.removeItem(LS_KEY_RESULT)
    }
  }, [result])

  const handleAnalyze = useCallback(async () => {
    if (!file) {
      setError('请先上传文件')
      return
    }
    const validPeriods = periods.filter(p => p.start && p.end)
    if (validPeriods.length === 0) {
      setError('请至少配置一个时段')
      return
    }

    setLoading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('timePeriods', JSON.stringify(validPeriods))

      const res = await fetch('/api/analyze', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '分析失败')
      setResult(data)
    } catch (err) {
      setError(String(err))
    }
    setLoading(false)
  }, [file, periods])

  const handleSave = useCallback(async () => {
    if (!result) return
    try {
      const res = await fetch('/api/history/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      })
      const data = await res.json()
      if (res.ok) {
        alert('已保存到历史记录')
      } else {
        alert('保存失败: ' + (data.error || ''))
      }
    } catch (err) {
      alert('保存失败: ' + String(err))
    }
  }, [result])

  const handleExport = useCallback(async () => {
    if (!result) return
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '导出失败')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const safeName = result.fileName.replace(/\.(xls|xlsx)$/i, '') || '分析结果'
      a.download = `${safeName}_排名.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('导出失败: ' + String(err))
    }
  }, [result])

  const handleCopy = useCallback(() => {
    if (!result || result.riders.length === 0) return
    const periodKeys = result.timePeriods.map(p => `${p.start}-${p.end}`)
    const header = ['排名', '骑手', '总单量', ...periodKeys]
    const rows = result.riders.map((r, i) => [
      String(i + 1),
      r.name,
      String(r.totalOrders),
      ...periodKeys.map(k => String(r.periodOrders[k] ?? 0)),
    ])
    const text = [header.join('\t'), ...rows.map(r => r.join('\t'))].join('\n')
    navigator.clipboard.writeText(text).then(() => {
      alert('已复制到剪贴板')
    })
  }, [result])

  const handleLoadHistory = useCallback((data: AnalysisResult) => {
    setResult(data)
    setPeriods(data.timePeriods)
  }, [])

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">骑手Excel分析工具</h1>
          <p className="text-sm text-gray-500 mt-1">上传订单Excel，快速统计各骑手总单量及时段产能</p>
        </header>

        <div className="bg-white rounded-xl border border-gray-200/80 px-6 py-4 mb-4">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <FileUpload onFileSelect={f => { setFile(f); setResult(null); setError('') }} />
            </div>
            <div className="w-px h-8 bg-gray-200 hidden sm:block" />
            <div className="flex-1 min-w-[260px]">
              <TimePeriodConfig periods={periods} onChange={setPeriods} disabled={loading} />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={loading || !file}
                className="h-9 px-5 bg-blue-600 text-white text-sm rounded-lg font-medium hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                {loading ? '分析中...' : '开始分析'}
              </button>
              {error && (
                <div className="text-red-500 text-xs">{error}</div>
              )}
            </div>
          </div>
        </div>

        <div className="mb-4">
          <HistoryPanel onLoadHistory={handleLoadHistory} />
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">骑手排名</h2>
            {result && result.riders.length > 0 && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-xs bg-orange-50 text-orange-700 px-3 py-1.5 rounded hover:bg-orange-100 transition-colors"
                >
                  复制名单
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded hover:bg-green-100 transition-colors"
                >
                  保存JSON
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded hover:bg-indigo-100 transition-colors"
                >
                  导出Excel
                </button>
              </div>
            )}
          </div>
          <RankingTable data={result} loading={loading} />
        </div>
      </div>
    </main>
  )
}
