import { NextRequest, NextResponse } from 'next/server'
import { parseSchedule } from '@/lib/analyze'
import type { TimePeriod } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const scheduleFile = formData.get('scheduleFile') as File | null
    const periodsRaw = formData.get('timePeriods') as string | null

    if (!scheduleFile) {
      return NextResponse.json({ error: '请上传排班文件' }, { status: 400 })
    }

    let timePeriods: TimePeriod[] = []
    if (periodsRaw) {
      timePeriods = JSON.parse(periodsRaw)
    }

    const buffer = await scheduleFile.arrayBuffer()
    const parsed = parseSchedule(buffer, timePeriods)

    const mergedPeriods = [...timePeriods]
    for (const p of parsed.derivedPeriods) {
      if (!mergedPeriods.some(tp => tp.start === p.start && tp.end === p.end)) {
        mergedPeriods.push(p)
      }
    }

    return NextResponse.json({
      scheduleDate: parsed.date,
      mergedPeriods,
      hasEntries: parsed.entries.length > 0,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: '解析排班失败: ' + String(err) }, { status: 500 })
  }
}
