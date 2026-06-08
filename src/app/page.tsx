'use client'

import { useState, useCallback } from 'react'
import FileUpload from '@/components/FileUpload'
import TimePeriodConfig from '@/components/TimePeriodConfig'
import RankingTable from '@/components/RankingTable'
import HistoryPanel from '@/components/HistoryPanel'
import type { TimePeriod, AnalysisResult } from '@/lib/types'

const DEFAULT_PERIODS: TimePeriod[] = [
  { start: '10:30', end: '13:30' },
  { start: '17:30', end: '20:30' },
]

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null)
  const [periods, setPeriods] = useState<TimePeriod[]>(DEFAULT_PERIODS)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

  const handleLoadHistory = useCallback((data: AnalysisResult) => {
    setResult(data)
    setPeriods(data.timePeriods)
  }, [])

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">骑手Excel分析工具</h1>
          <p className="text-sm text-gray-500 mt-1">上传订单Excel，快速统计各骑手总单量及时段产能</p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
              <FileUpload onFileSelect={f => { setFile(f); setResult(null); setError('') }} />
              <TimePeriodConfig periods={periods} onChange={setPeriods} disabled={loading} />

              <button
                type="button"
                onClick={handleAnalyze}
                disabled={loading || !file}
                className="w-full bg-blue-600 text-white rounded-lg py-2 font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '分析中...' : '开始分析'}
              </button>

              {error && (
                <div className="text-red-500 text-sm bg-red-50 rounded px-3 py-2">{error}</div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5">
              <HistoryPanel onLoadHistory={handleLoadHistory} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">骑手排名</h2>
              {result && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSave}
                    className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded hover:bg-green-100 transition-colors"
                  >
                    保存JSON
                  </button>
                  <button
                    type="button"
                    onClick={handleExport}
                    className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1 rounded hover:bg-indigo-100 transition-colors"
                  >
                    导出Excel
                  </button>
                </div>
              )}
            </div>
            <RankingTable data={result} loading={loading} />
          </div>
        </div>
      </div>
    </main>
  )
}
