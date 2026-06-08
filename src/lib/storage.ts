import * as fs from 'fs'
import * as path from 'path'
import type { AnalysisResult, HistoryRecord } from './types'

const STORAGE_DIR = path.join(process.cwd(), 'storage', 'analysis')

function ensureDir() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true })
  }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
}

function saveAnalysis(data: AnalysisResult): HistoryRecord {
  ensureDir()
  const id = generateId()
  const record: HistoryRecord & { data: AnalysisResult } = {
    id,
    fileName: data.fileName,
    analysisTime: data.analysisTime,
    totalOrders: data.totalOrders,
    timePeriods: data.timePeriods,
    data,
  }
  const filePath = path.join(STORAGE_DIR, `${id}.json`)
  fs.writeFileSync(filePath, JSON.stringify(record, null, 2), 'utf-8')
  return { id, fileName: record.fileName, analysisTime: record.analysisTime, totalOrders: record.totalOrders, timePeriods: record.timePeriods }
}

function listHistory(): HistoryRecord[] {
  ensureDir()
  const files = fs.readdirSync(STORAGE_DIR).filter(f => f.endsWith('.json'))
  const records: HistoryRecord[] = []
  for (const f of files) {
    try {
      const content = JSON.parse(fs.readFileSync(path.join(STORAGE_DIR, f), 'utf-8'))
      records.push({
        id: content.id,
        fileName: content.fileName,
        analysisTime: content.analysisTime,
        totalOrders: content.totalOrders,
        timePeriods: content.timePeriods,
      })
    } catch { }
  }
  records.sort((a, b) => new Date(b.analysisTime).getTime() - new Date(a.analysisTime).getTime())
  return records
}

function getFullRecord(id: string): (HistoryRecord & { data: AnalysisResult }) | null {
  ensureDir()
  const filePath = path.join(STORAGE_DIR, `${id}.json`)
  if (!fs.existsSync(filePath)) return null
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch {
    return null
  }
}

function deleteRecord(id: string): boolean {
  ensureDir()
  const filePath = path.join(STORAGE_DIR, `${id}.json`)
  if (!fs.existsSync(filePath)) return false
  fs.unlinkSync(filePath)
  return true
}

export { saveAnalysis, listHistory, getFullRecord, deleteRecord }
