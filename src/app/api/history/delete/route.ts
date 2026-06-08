import { NextRequest, NextResponse } from 'next/server'
import { deleteRecord } from '@/lib/storage'

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: '缺少id参数' }, { status: 400 })
  }
  const ok = deleteRecord(id)
  if (!ok) {
    return NextResponse.json({ error: '记录不存在' }, { status: 404 })
  }
  return NextResponse.json({ success: true })
}
