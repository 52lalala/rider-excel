import { NextRequest, NextResponse } from 'next/server'
import { saveAnalysis } from '@/lib/storage'
import type { AnalysisResult } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const data: AnalysisResult = await req.json()
    const record = saveAnalysis(data)
    return NextResponse.json(record)
  } catch (err) {
    return NextResponse.json({ error: '保存失败: ' + String(err) }, { status: 500 })
  }
}
