import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { scrapeRecipeFromUrl } from '@/lib/scrapers'

const importSchema = z.object({
  url: z.string().url('Please enter a valid URL'),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsed = importSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors.url?.[0] ?? 'Invalid URL' },
        { status: 400 }
      )
    }

    const recipe = await scrapeRecipeFromUrl(parsed.data.url)
    return NextResponse.json(recipe)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to import recipe'
    return NextResponse.json({ error: message }, { status: 422 })
  }
}
