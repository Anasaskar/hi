import { NextResponse } from 'next/server'
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import path from 'path'

// Initialize LowDB
const file = path.join(process.cwd(), 'data', 'orders.json')
const adapter = new JSONFile(file)
const db = new Low(adapter, { orders: [] })

export async function GET() {
  try {
    await db.read()
    const orders = db.data.orders || []
    
    return NextResponse.json({ ok: true, orders })
  } catch (error) {
    console.error('Failed to fetch orders:', error)
    return NextResponse.json(
      { ok: false, message: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const orderData = await request.json()
    
    await db.read()
    
    const newOrder = {
      id: Date.now().toString(),
      ...orderData,
      createdAt: Date.now()
    }
    
    db.data.orders.unshift(newOrder)
    await db.write()
    
    return NextResponse.json({ ok: true, order: newOrder })
  } catch (error) {
    console.error('Failed to save order:', error)
    return NextResponse.json(
      { ok: false, message: 'Failed to save order' },
      { status: 500 }
    )
  }
}
