import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createInstacartShoppingList } from '@/lib/integrations/instacart'

export interface InstacartCartRequest {
  items: Array<{
    name: string
    quantity: number
    unit: string
  }>
  listTitle: string
  linkbackUrl?: string
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body: InstacartCartRequest = await req.json()

    if (!body.items?.length) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 })
    }

    // Map grocery items to Instacart line items.
    // Instacart matches on the name string — keep units in the display_text
    // for context but send name alone for better product matching.
    const line_items = body.items.map((item) => ({
      name: item.name,
      display_text: `${item.quantity} ${item.unit} ${item.name}`.trim(),
      quantity: item.quantity > 0 ? item.quantity : 1,
      unit: item.unit !== 'whole' ? item.unit : undefined,
    }))

    const url = await createInstacartShoppingList({
      title: body.listTitle || 'Meal Plan Grocery List',
      line_items,
      partner_linkback_url: body.linkbackUrl,
    })

    return NextResponse.json({ url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create Instacart list'
    const status = message.includes('not configured') ? 503 : 502
    return NextResponse.json({ error: message }, { status })
  }
}
