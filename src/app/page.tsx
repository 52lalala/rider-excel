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
const LS_KEY_SCHEDULE = 'rider-excel-schedule'

interface StoredScheduleConfig {
  name: string
  dataUrl: string
  periods: TimePeriod[]
  scheduleDate?: string
}

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function dataUrlToFile(dataUrl: string, fileName: string): File {
  const [meta, base64] = dataUrl.split(',')
  const mimeMatch = meta?.match(/data:(.*?);/)
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream'
  const binary = atob(base64 || '')
  const length = binary.length
  const bytes = new Uint8Array(length)
  for (let i = 0; i < length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new File([bytes], fileName, { type: mime })
}

function sanitizePeriods(periods: TimePeriod[]): TimePeriod[] {
  return periods.filter(p => p.start && p.end)
}

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null)
  const [periods, setPeriods] = useState<TimePeriod[]>(DEFAULT_PERIODS)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [scheduleFile, setScheduleFile] = useState<File | null>(null)
  const [showScheduleConfig, setShowScheduleConfig] = useState(false)
  const [draftPeriods, setDraftPeriods] = useState<TimePeriod[]>(DEFAULT_PERIODS)
  const [draftScheduleFile, setDraftScheduleFile] = useState<File | null>(null)
  const [scheduleInfo, setScheduleInfo] = useState<{ fileName: string; scheduleDate?: string } | null>(null)
  const [draftScheduleDate, setDraftScheduleDate] = useState<string>('')
  const [schedulePreviewLoading, setSchedulePreviewLoading] = useState(false)
  const [schedulePreviewError, setSchedulePreviewError] = useState('')
  const [configSaving, setConfigSaving] = useState(false)

  useEffect(() => {
    const storedPeriods = loadFromStorage(LS_KEY_PERIODS, DEFAULT_PERIODS)
    setPeriods(storedPeriods)
    setDraftPeriods(storedPeriods)
    setResult(loadFromStorage<AnalysisResult | null>(LS_KEY_RESULT, null))

    const storedSchedule = loadFromStorage<StoredScheduleConfig | null>(LS_KEY_SCHEDULE, null)
    if (storedSchedule && storedSchedule.dataUrl && storedSchedule.name) {
      try {
        const restoredFile = dataUrlToFile(storedSchedule.dataUrl, storedSchedule.name)
        setScheduleFile(restoredFile)
        setDraftScheduleFile(restoredFile)
        if (storedSchedule.periods && storedSchedule.periods.length > 0) {
          setPeriods(storedSchedule.periods)
          setDraftPeriods(storedSchedule.periods)
        }
        setScheduleInfo({ fileName: storedSchedule.name, scheduleDate: storedSchedule.scheduleDate })
        setDraftScheduleDate(storedSchedule.scheduleDate ?? '')
      } catch (err) {
        console.error('恢复排班配置失败', err)
        if (typeof window !== 'undefined') {
          localStorage.removeItem(LS_KEY_SCHEDULE)
        }
      }
    }
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
      setError('请先上传订单Excel')
      return
    }
    const validPeriods = sanitizePeriods(periods)
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
      if (scheduleFile) {
        fd.append('scheduleFile', scheduleFile)
      }

      const res = await fetch('/api/analyze', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '分析失败')
      setResult(data)
      if (Array.isArray(data.timePeriods)) {
        setPeriods(data.timePeriods)
        setDraftPeriods(data.timePeriods)
      }
      if (data.scheduleDate) {
        setScheduleInfo(prev => {
          const fileName = prev?.fileName || scheduleFile?.name || ''
          if (!fileName) return prev
          return { fileName, scheduleDate: data.scheduleDate }
        })
        if (typeof window !== 'undefined') {
          const stored = loadFromStorage<StoredScheduleConfig | null>(LS_KEY_SCHEDULE, null)
          if (stored) {
            stored.scheduleDate = data.scheduleDate
            localStorage.setItem(LS_KEY_SCHEDULE, JSON.stringify(stored))
          }
        }
      }
    } catch (err) {
      setError(String(err))
    }
    setLoading(false)
  }, [file, periods, scheduleFile])

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

  const handleDraftScheduleSelect = useCallback(async (selected: File) => {
    setDraftScheduleFile(selected)
    setSchedulePreviewError('')
    setDraftScheduleDate('')
    setSchedulePreviewLoading(true)
    try {
      const fd = new FormData()
      fd.append('scheduleFile', selected)
      const current = sanitizePeriods(draftPeriods)
      fd.append('timePeriods', JSON.stringify(current))
      const res = await fetch('/api/schedule', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || '解析排班失败')
      }
      if (Array.isArray(data.mergedPeriods) && data.mergedPeriods.length > 0) {
        setDraftPeriods(data.mergedPeriods)
      }
      setDraftScheduleDate(data.scheduleDate ?? '')
    } catch (err) {
      setSchedulePreviewError(String(err))
    } finally {
      setSchedulePreviewLoading(false)
    }
  }, [draftPeriods])

  const handleDraftScheduleClear = useCallback(() => {
    setDraftScheduleFile(null)
    setDraftScheduleDate('')
    setSchedulePreviewError('')
    setSchedulePreviewLoading(false)
  }, [])

  const handleScheduleConfigSave = useCallback(async () => {
    setConfigSaving(true)
    setSchedulePreviewError('')
    try {
      const sanitized = sanitizePeriods(draftPeriods)
      const nextPeriods = sanitized.length > 0 ? sanitized : DEFAULT_PERIODS
      setPeriods(nextPeriods)
      setDraftPeriods(nextPeriods)

      if (draftScheduleFile) {
        setScheduleFile(draftScheduleFile)
        setScheduleInfo({ fileName: draftScheduleFile.name, scheduleDate: draftScheduleDate || undefined })
        if (typeof window !== 'undefined') {
          const dataUrl = await fileToDataUrl(draftScheduleFile)
          const stored: StoredScheduleConfig = {
            name: draftScheduleFile.name,
            dataUrl,
            periods: nextPeriods,
            scheduleDate: draftScheduleDate || undefined,
          }
          localStorage.setItem(LS_KEY_SCHEDULE, JSON.stringify(stored))
        }
      } else {
        setScheduleFile(null)
        setScheduleInfo(null)
        if (typeof window !== 'undefined') {
          localStorage.removeItem(LS_KEY_SCHEDULE)
        }
      }

      setShowScheduleConfig(false)
    } catch (err) {
      setSchedulePreviewError(String(err))
    } finally {
      setConfigSaving(false)
    }
  }, [draftPeriods, draftScheduleDate, draftScheduleFile])

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
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <FileUpload
                onFileSelect={f => { setFile(f); setResult(null); setError('') }}
                inputId="orders-input"
                placeholder="上传订单Excel"
                disabled={loading}
              />
              <div className="hidden sm:block w-px h-8 bg-gray-200" />
              <div className="flex flex-col gap-1 text-xs text-gray-500 min-w-0">
                <div className="flex flex-wrap gap-1 items-center">
                  <span className="font-medium text-gray-600">当前时段:</span>
                  {periods.filter(p => p.start && p.end).length > 0 ? (
                    periods
                      .filter(p => p.start && p.end)
                      .map(p => (
                        <span key={`${p.start}-${p.end}`} className="px-2 py-0.5 bg-gray-100 rounded-full">
                          {p.start}-{p.end}
                        </span>
                      ))
                  ) : (
                    <span className="text-gray-400">尚未配置</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-gray-600">排班文件:</span>
                    {scheduleInfo ? (
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full truncate max-w-[200px]">
                        {scheduleInfo.fileName}
                      </span>
                    ) : (
                      <span className="text-gray-400">未上传</span>
                    )}
                  </div>
                  {scheduleInfo?.scheduleDate && (
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">排班日期 {scheduleInfo.scheduleDate}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setDraftPeriods(periods)
                  setDraftScheduleFile(scheduleFile)
                  setDraftScheduleDate(scheduleInfo?.scheduleDate ?? '')
                  setSchedulePreviewError('')
                  setSchedulePreviewLoading(false)
                  setShowScheduleConfig(true)
                }}
                className="h-9 px-4 border border-gray-200 text-gray-600 text-sm rounded-lg font-medium hover:border-blue-400 hover:text-blue-600 transition-colors"
              >
                配置排班
              </button>
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
      {showScheduleConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">配置排班与时段</h3>
              <button
                type="button"
                onClick={() => setShowScheduleConfig(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-2">班次时段</h4>
                <TimePeriodConfig periods={draftPeriods} onChange={setDraftPeriods} />
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-2">排班Excel</h4>
                <div className="flex items-center gap-3">
                  <FileUpload
                    onFileSelect={handleDraftScheduleSelect}
                    inputId="schedule-modal-input"
                    placeholder="选择排班Excel"
                    disabled={schedulePreviewLoading || configSaving}
                  />
                  {draftScheduleFile && (
                    <button
                      type="button"
                      onClick={handleDraftScheduleClear}
                      className="text-xs text-red-500 hover:text-red-600"
                    >
                      清除
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-2">常见做法是上传一周排班 Excel，系统会自动取最早日期的班次作为分析依据。</p>
                {schedulePreviewLoading && <p className="text-xs text-blue-500 mt-1">解析排班中...</p>}
                {schedulePreviewError && <p className="text-xs text-red-500 mt-1">{schedulePreviewError}</p>}
                {draftScheduleFile && !schedulePreviewLoading && !schedulePreviewError && (
                  <p className="text-xs text-indigo-600 mt-1 truncate">当前文件：{draftScheduleFile.name}</p>
                )}
                {draftScheduleDate && (
                  <p className="text-xs text-green-600 mt-1">识别到排班日期：{draftScheduleDate}</p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowScheduleConfig(false)}
                className="px-4 py-2 text-sm rounded-lg text-gray-500 hover:text-gray-700"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleScheduleConfigSave}
                disabled={schedulePreviewLoading || configSaving}
                className={`px-4 py-2 text-sm rounded-lg text-white ${schedulePreviewLoading || configSaving ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {configSaving ? '保存中...' : '保存配置'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
