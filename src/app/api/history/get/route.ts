import { NextRequest, NextResponse } from 'next/server'
import { getFullRecord } from '@/lib/storage'

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: '缺少id参数' }, { status: 400 })
  }
  const record = getFullRecord(id)
  if (!record) {
    return NextResponse.json({ error: '记录不存在' }, { status: 404 })
  }
  return NextResponse.json(record.data)
}
