import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import type { AnalysisResult } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const data: AnalysisResult = await req.json()

    const headers = ['排名', '骑手', '总单量']
    const periodKeys = data.timePeriods.map(p => `${p.start}-${p.end}`)
    headers.push(...periodKeys)

    const rows: unknown[][] = []
    data.riders.forEach((rider, idx) => {
      const row: unknown[] = [idx + 1, rider.name, rider.totalOrders]
      for (const key of periodKeys) {
        row.push(rider.periodOrders[key] ?? 0)
      }
      rows.push(row)
    })

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    ws['!colwidths'] = headers.map(() => ({ wch: 16 }))

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '骑手排名')

    const output = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' })

    const safeName = data.fileName.replace(/\.(xls|xlsx)$/i, '') || '分析结果'

    return new NextResponse(output, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(safeName)}_排名.xlsx"`,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: '导出失败: ' + String(err) }, { status: 500 })
  }
}
