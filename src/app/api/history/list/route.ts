import { NextResponse } from 'next/server'
import { listHistory } from '@/lib/storage'

export async function GET() {
  const records = listHistory()
  return NextResponse.json(records)
}
