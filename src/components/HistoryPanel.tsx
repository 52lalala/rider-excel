'use client'

import { useState, useCallback } from 'react'
import type { HistoryRecord, AnalysisResult } from '@/lib/types'

interface Props {
  onLoadHistory: (data: AnalysisResult) => void
}

export default function HistoryPanel({ onLoadHistory }: Props) {
  const [records, setRecords] = useState<HistoryRecord[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/history/list')
      const data = await res.json()
      setRecords(data)
    } catch { }
    setLoading(false)
  }, [])

  const toggleOpen = () => {
    const next = !open
    setOpen(next)
    if (next) fetchRecords()
  }

  const handleLoad = async (id: string) => {
    try {
      const res = await fetch(`/api/history/get?id=${id}`)
      const data: AnalysisResult = await res.json()
      onLoadHistory(data)
      setOpen(false)
    } catch { }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/history/delete?id=${id}`, { method: 'DELETE' })
      fetchRecords()
    } catch { }
  }

  return (
    <div>
        <button
          type="button"
          onClick={toggleOpen}
          className="text-sm text-gray-600 hover:text-gray-900 underline underline-offset-2"
      >
        {open ? '收起历史记录' : '查看历史记录'}
      </button>

      {open && (
        <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
          {loading && <div className="text-sm text-gray-400">加载中...</div>}
          {!loading && records.length === 0 && (
            <div className="text-sm text-gray-400">暂无历史记录</div>
          )}
          {records.map(r => (
            <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2 text-sm">
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium">{r.fileName}</div>
                <div className="text-xs text-gray-400">
                  {new Date(r.analysisTime).toLocaleString('zh-CN')} · 共{r.totalOrders}单
                </div>
              </div>
              <div className="flex gap-1 ml-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleLoad(r.id)}
                  className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1"
                >
                  查看
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(r.id)}
                  className="text-red-400 hover:text-red-600 text-xs px-2 py-1"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
