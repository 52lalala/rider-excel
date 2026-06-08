export interface TimePeriod {
  start: string
  end: string
}

export interface RiderStats {
  id: string
  name: string
  totalOrders: number
  periodOrders: Record<string, number>
  scheduleStatus?: string
  scheduledPeriods?: string[]
  shiftLabels?: string[]
}

export interface AnalysisResult {
  fileName: string
  analysisTime: string
  totalOrders: number
  riders: RiderStats[]
  timePeriods: TimePeriod[]
  scheduleDate?: string
}

export interface HistoryRecord {
  id: string
  fileName: string
  analysisTime: string
  totalOrders: number
  timePeriods: TimePeriod[]
}

export interface OrderRow {
  riderId: string
  riderName: string
  orderTime: string
}

export interface RiderScheduleEntry {
  riderId: string
  riderName: string
  date: string
  status: string
  shiftLabels: string[]
  periods: string[]
}
