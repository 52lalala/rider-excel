import { NextRequest, NextResponse } from 'next/server'
import { parseExcel, parseSchedule, analyzeOrders } from '@/lib/analyze'
import type { TimePeriod } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const scheduleFile = formData.get('scheduleFile') as File | null
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

    let scheduleEntries: ReturnType<typeof parseSchedule>['entries'] = []
    let scheduleDate = ''
    let mergedPeriods = [...timePeriods]

    if (scheduleFile) {
      const scheduleBuffer = await scheduleFile.arrayBuffer()
      const parsedSchedule = parseSchedule(scheduleBuffer, timePeriods)
      scheduleEntries = parsedSchedule.entries
      scheduleDate = parsedSchedule.date

      for (const p of parsedSchedule.derivedPeriods) {
        const key = `${p.start}-${p.end}`
        if (!mergedPeriods.some(tp => tp.start === p.start && tp.end === p.end)) {
          mergedPeriods.push(p)
        }
      }
    }

    const result = analyzeOrders(orders, mergedPeriods, scheduleEntries, scheduleDate)
    result.fileName = file.name
    result.timePeriods = mergedPeriods

    return NextResponse.json(result)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: '分析失败: ' + String(err) }, { status: 500 })
  }
}
