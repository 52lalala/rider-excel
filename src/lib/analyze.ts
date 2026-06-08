import * as XLSX from 'xlsx'
import type { OrderRow, TimePeriod, RiderStats, AnalysisResult } from './types'

function normalizeHeader(h: string): string {
  return h.trim().replace(/\s/g, '')
}

function isRiderNameHeader(h: string): boolean {
  const s = normalizeHeader(h)
  return /骑手/.test(s) || /姓名/.test(s) || /配送员/.test(s) || /name/i.test(s) || /rider/i.test(s)
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
  if (!riderCol) riderCol = headers[0]
  if (!timeCol) timeCol = headers.length > 1 ? headers[1] : headers[0]

  const orders: OrderRow[] = []
  for (const row of rows) {
    const riderName = String(row[riderCol] ?? '').trim()
    if (!riderName) continue
    const timeStr = parseTimeValue(row[timeCol])
    if (!timeStr) continue
    orders.push({ riderName, orderTime: timeStr })
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
  if (riderIdx === -1 || timeIdx === -1) return []

  const orders: OrderRow[] = []
  for (let i = headerRowIdx + 1; i < aoa.length; i++) {
    const row = aoa[i]
    const riderName = String(row[riderIdx] ?? '').trim()
    if (!riderName || isRiderNameHeader(riderName)) continue
    const timeStr = parseTimeValue(row[timeIdx])
    if (!timeStr) continue
    orders.push({ riderName, orderTime: timeStr })
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

function isInPeriod(time: string, period: TimePeriod): boolean {
  return time >= period.start && time < period.end
}

function analyzeOrders(orders: OrderRow[], timePeriods: TimePeriod[]): AnalysisResult {
  const riderMap = new Map<string, RiderStats>()

  for (const order of orders) {
    let stats = riderMap.get(order.riderName)
    if (!stats) {
      const periodOrders: Record<string, number> = {}
      for (const p of timePeriods) {
        periodOrders[`${p.start}-${p.end}`] = 0
      }
      stats = { name: order.riderName, totalOrders: 0, periodOrders }
      riderMap.set(order.riderName, stats)
    }

    stats.totalOrders++
    for (const p of timePeriods) {
      if (isInPeriod(order.orderTime, p)) {
        stats.periodOrders[`${p.start}-${p.end}`]++
      }
    }
  }

  const riders = Array.from(riderMap.values()).sort((a, b) => b.totalOrders - a.totalOrders)

  return {
    fileName: '',
    analysisTime: new Date().toISOString(),
    totalOrders: orders.length,
    riders,
    timePeriods,
  }
}

export { parseExcel, analyzeOrders }
