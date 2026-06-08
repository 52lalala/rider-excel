import { NextRequest, NextResponse } from 'next/server'
import { parseExcel, analyzeOrders } from '@/lib/analyze'
import type { TimePeriod } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const periodsRaw = formData.get('timePeriods') as string | null

    if (!file) {
      return NextResponse.json({ error: '请上传文件' }, { status: 400 })
    }

    let timePeriods: TimePeriod[] = []
    if (periodsRaw) {
      timePeriods = JSON.parse(periodsRaw)
    }

    const buffer = await file.arrayBuffer()
    const orders = parseExcel(buffer)
    const result = analyzeOrders(orders, timePeriods)
    result.fileName = file.name

    return NextResponse.json(result)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: '分析失败: ' + String(err) }, { status: 500 })
  }
}
