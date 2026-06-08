import * as XLSX from 'xlsx'
import type { OrderRow, TimePeriod, RiderStats, AnalysisResult, RiderScheduleEntry } from './types'

function normalizeHeader(h: string): string {
  return h.trim().replace(/\s/g, '')
}

function isRiderNameHeader(h: string): boolean {
  const s = normalizeHeader(h)
  return /骑手/.test(s) || /姓名/.test(s) || /配送员/.test(s) || /name/i.test(s) || /rider/i.test(s)
}

function isRiderIdHeader(h: string): boolean {
  const s = normalizeHeader(h)
  const specific = /骑手id/i.test(s) || /riderid/i.test(s)
  const exactId = /^id$/i.test(s)
  return specific || exactId
}

function normalizeRiderId(val: string): string {
  const s = val.trim()
  if (!s || s === '-1' || s === '0') return ''
  return s
}

function normalizeScheduleTime(val: string): string {
  const match = val.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return ''
  const hour = match[1].padStart(2, '0')
  const minute = match[2]
  return `${hour}:${minute}`
}

function extractShiftInfo(raw: string): { label: string; start: string; end: string } {
  const trimmed = raw.trim()
  if (!trimmed || trimmed === '-') {
    return { label: '', start: '', end: '' }
  }

  const timeMatch = trimmed.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/)
  if (!timeMatch) {
    return { label: trimmed, start: '', end: '' }
  }
  const start = normalizeScheduleTime(timeMatch[1])
  const end = normalizeScheduleTime(timeMatch[2])
  const label = trimmed.replace(timeMatch[0], '').trim()
  return { label, start, end }
}

function isOrderTimeHeader(h: string): boolean {
  const s = normalizeHeader(h)
  return /订单时间/.test(s) || /下单时间/.test(s) || /时间/.test(s) || /time/i.test(s) || /日期/.test(s)
}

function parseTimeValue(val: unknown): string {
  if (typeof val === 'number') {
    const date = XLSX.SSF.parse_date_code(val)
    if (date) {
      return `${String(date.H).padStart(2, '0')}:${String(date.M).padStart(2, '0')}`
    }
  }
  if (val instanceof Date) {
    return `${String(val.getHours()).padStart(2, '0')}:${String(val.getMinutes()).padStart(2, '0')}`
  }
  const s = String(val ?? '').trim()
  if (!s) return ''
  const m = s.match(/(\d{1,2}):(\d{2})/)
  if (m) return `${m[1].padStart(2, '0')}:${m[2]}`
  if (!isNaN(Date.parse(s))) {
    const d = new Date(s)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
  return ''
}

function findColIndex(headers: string[], matcher: (h: string) => boolean): number {
  return headers.findIndex(h => matcher(h))
}

function tryParseWithHeaders(rows: Record<string, unknown>[]): OrderRow[] {
  const headers = Object.keys(rows[0])
  let riderCol = headers[findColIndex(headers, isRiderNameHeader)]
  let timeCol = headers[findColIndex(headers, isOrderTimeHeader)]
  const idCol = headers[findColIndex(headers, isRiderIdHeader)]
  if (!riderCol) riderCol = headers[0]
  if (!timeCol) timeCol = headers.length > 1 ? headers[1] : headers[0]

  const orders: OrderRow[] = []
  for (const row of rows) {
    const riderName = String(row[riderCol] ?? '').trim()
    if (!riderName) continue
    const timeStr = parseTimeValue(row[timeCol])
    if (!timeStr) continue
    const riderId = normalizeRiderId(idCol ? String(row[idCol] ?? '') : '')
    orders.push({ riderId, riderName, orderTime: timeStr })
  }
  return orders
}

function tryParseRaw(workbook: XLSX.WorkBook, sheetName: string): OrderRow[] {
  const sheet = workbook.Sheets[sheetName]
  const aoa = XLSX.utils.sheet_to_json<(string | number | Date)[]>(sheet, { header: 1 }) as unknown[][]
  if (aoa.length < 2) return []

  let headerRowIdx = -1
  for (let i = 0; i < Math.min(aoa.length, 15); i++) {
    const row = aoa[i]
    const vals = row.map(v => String(v ?? '').trim())
    if (vals.some(v => isRiderNameHeader(v)) && vals.some(v => isOrderTimeHeader(v))) {
      headerRowIdx = i
      break
    }
  }
  if (headerRowIdx === -1) return []

  const headerRow = aoa[headerRowIdx].map(v => String(v ?? '').trim())
  const riderIdx = findColIndex(headerRow, isRiderNameHeader)
  const timeIdx = findColIndex(headerRow, isOrderTimeHeader)
  const idIdx = findColIndex(headerRow, isRiderIdHeader)
  if (riderIdx === -1 || timeIdx === -1) return []

  const orders: OrderRow[] = []
  for (let i = headerRowIdx + 1; i < aoa.length; i++) {
    const row = aoa[i]
    const riderName = String(row[riderIdx] ?? '').trim()
    if (!riderName || isRiderNameHeader(riderName)) continue
    const timeStr = parseTimeValue(row[timeIdx])
    if (!timeStr) continue
    const riderId = normalizeRiderId(idIdx !== -1 ? String(row[idIdx] ?? '') : '')
    orders.push({ riderId, riderName, orderTime: timeStr })
  }
  return orders
}

function parseExcel(buffer: ArrayBuffer): OrderRow[] {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  const sheetName = workbook.SheetNames[0]

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: '' })

  if (rows.length > 0) {
    const result = tryParseWithHeaders(rows)
    if (result.length > 0) return result
  }

  return tryParseRaw(workbook, sheetName)
}

function parseSchedule(
  buffer: ArrayBuffer,
  timePeriods: TimePeriod[]
): { entries: RiderScheduleEntry[]; date: string; derivedPeriods: TimePeriod[] } {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  const sheetName = workbook.SheetNames[0]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: '' })

  if (rows.length === 0) {
    return { entries: [], date: '', derivedPeriods: [] }
  }

  const availableDates = rows
    .map(row => String(row['日期'] ?? row['date'] ?? '').trim())
    .filter(Boolean)

  const targetDate = availableDates.sort()[0] ?? ''
  const filteredRows = targetDate ? rows.filter(row => String(row['日期'] ?? row['date'] ?? '').trim() === targetDate) : rows
  const periodKeys = new Set(timePeriods.map(p => `${p.start}-${p.end}`))
  const derivedPeriodsMap = new Map<string, TimePeriod>()

  const scheduleMap = new Map<string, RiderScheduleEntry>()

  for (const row of filteredRows) {
    const riderId = normalizeRiderId(String(row['骑手ID'] ?? row['骑手id'] ?? row['riderId'] ?? ''))
    const riderName = String(row['骑手'] ?? row['配送员'] ?? row['姓名'] ?? row['riderName'] ?? '').trim()
    if (!riderName) continue
    const status = String(row['排班状态'] ?? row['排班'] ?? row['状态'] ?? '').trim() || '未排班'
    const shiftRaw = String(row['班次时段'] ?? row['时段'] ?? row['班次'] ?? '').trim()
    const { label, start, end } = extractShiftInfo(shiftRaw)
    const periodKey = start && end ? `${start}-${end}` : null

    const key = riderId || riderName
    let entry = scheduleMap.get(key)
    if (!entry) {
      entry = {
        riderId,
        riderName,
        date: targetDate,
        status,
        shiftLabels: [],
        periods: [],
      }
      scheduleMap.set(key, entry)
    }

    entry.status = status
    if (label) {
      entry.shiftLabels = Array.from(new Set([...entry.shiftLabels, label]))
    }
    if (periodKey) {
      const normalizedKey = periodKeys.has(periodKey) ? periodKey : periodKey
      entry.periods = Array.from(new Set([...entry.periods, normalizedKey]))
      if (!periodKeys.has(periodKey) && !derivedPeriodsMap.has(periodKey)) {
        derivedPeriodsMap.set(periodKey, {
          start,
          end,
        })
      }
    }
  }

  return {
    entries: Array.from(scheduleMap.values()),
    date: targetDate,
    derivedPeriods: Array.from(derivedPeriodsMap.values()),
  }
}

function isInPeriod(time: string, period: TimePeriod): boolean {
  return time >= period.start && time < period.end
}

function analyzeOrders(
  orders: OrderRow[],
  timePeriods: TimePeriod[],
  scheduleEntries: RiderScheduleEntry[] = [],
  scheduleDate?: string
): AnalysisResult {
  const riderMap = new Map<string, RiderStats>()

  const createEmptyStats = (id: string, name: string): RiderStats => {
    const periodOrders: Record<string, number> = {}
    for (const p of timePeriods) {
      periodOrders[`${p.start}-${p.end}`] = 0
    }
    return {
      id,
      name,
      totalOrders: 0,
      periodOrders,
      scheduleStatus: '未排班',
      scheduledPeriods: [],
      shiftLabels: [],
    }
  }

  const setKeys = (stats: RiderStats, id: string, name: string) => {
    if (id) {
      riderMap.set(id, stats)
    }
    riderMap.set(name, stats)
  }

  const getStats = (id: string, name: string): RiderStats | undefined => {
    if (id && riderMap.has(id)) return riderMap.get(id)
    if (riderMap.has(name)) return riderMap.get(name)
    return undefined
  }

  for (const order of orders) {
    const riderId = order.riderId
    const riderName = order.riderName
    const keyId = riderId
    let stats = getStats(keyId, riderName)
    if (!stats) {
      const initialId = riderId || riderName
      stats = createEmptyStats(initialId, riderName)
      setKeys(stats, riderId, riderName)
    }
    if (!stats.id && riderId) {
      stats.id = riderId
    }

    stats.totalOrders++
    for (const p of timePeriods) {
      if (isInPeriod(order.orderTime, p)) {
        stats.periodOrders[`${p.start}-${p.end}`]++
      }
    }
  }

  for (const entry of scheduleEntries) {
    const riderId = entry.riderId
    const riderName = entry.riderName
    let stats = getStats(riderId, riderName)
    if (!stats) {
      const initialId = riderId || riderName
      stats = createEmptyStats(initialId, riderName)
      setKeys(stats, riderId, riderName)
    }

    if (riderId && !stats.id) {
      stats.id = riderId
    }

    stats.scheduleStatus = entry.status || '未排班'
    stats.scheduledPeriods = entry.periods
    stats.shiftLabels = entry.shiftLabels
  }

  const uniqueStats = Array.from(new Set(riderMap.values()))

  for (const stats of uniqueStats) {
    if (!stats.scheduleStatus) {
      stats.scheduleStatus = '未排班'
    }
    if (!stats.scheduledPeriods) {
      stats.scheduledPeriods = []
    }
    if (!stats.shiftLabels) {
      stats.shiftLabels = []
    }
    if (!stats.id) {
      stats.id = stats.name
    }
  }

  const riders = uniqueStats.sort((a, b) => b.totalOrders - a.totalOrders)

  return {
    fileName: '',
    analysisTime: new Date().toISOString(),
    totalOrders: orders.length,
    riders,
    timePeriods,
    scheduleDate,
  }
}

export { parseExcel, parseSchedule, analyzeOrders }
