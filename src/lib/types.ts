export interface TimePeriod {
  start: string
  end: string
}

export interface RiderStats {
  name: string
  totalOrders: number
  periodOrders: Record<string, number>
}

export interface AnalysisResult {
  fileName: string
  analysisTime: string
  totalOrders: number
  riders: RiderStats[]
  timePeriods: TimePeriod[]
}

export interface HistoryRecord {
  id: string
  fileName: string
  analysisTime: string
  totalOrders: number
  timePeriods: TimePeriod[]
}

export interface OrderRow {
  riderName: string
  orderTime: string
}
