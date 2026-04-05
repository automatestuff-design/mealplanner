import { extractIngredientsFromText, extractInstructionsFromText, getIngredientGroups, type ScrapedRecipe } from './utils'

interface InstagramOEmbed {
  title?: string
  author_name?: string
  thumbnail_url?: string
  html?: string
}

export async function scrapeInstagram(url: string): Promise<ScrapedRecipe> {
  // Instagram's public oEmbed endpoint — works for public posts without a token
  const oembedUrl = `https://graph.facebook.com/v18.0/instagram_oembed?url=${encodeURIComponent(url)}&omitscript=true`

  let data: InstagramOEmbed | null = null

  try {
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(10000) })
    if (res.ok) {
      data = await res.json()
    }
  } catch { /* ignore */ }

  // Fallback: try the basic oembed endpoint (no token, limited data)
  if (!data) {
    try {
      const basicUrl = `https://www.instagram.com/p/${extractPostId(url)}/embed/`
      const res = await fetch(basicUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(10000),
      })
      // Can't get much from embed without parsing JS, return low-confidence stub
      data = { title: 'Instagram Recipe', author_name: extractUsername(url) }
    } catch { /* ignore */ }
  }

  const caption = data?.title ?? ''
  const ingredients = extractIngredientsFromText(caption)
  const instructions = extractInstructionsFromText(caption)

  return {
    title: caption
      ? caption.replace(/#\w+/g, '').replace(/@\w+/g, '').trim().slice(0, 100) || 'Instagram Recipe'
      : 'Instagram Recipe',
    description: data?.author_name ? `Imported from Instagram by @${data.author_name}` : 'Imported from Instagram',
    instructions: instructions || 'See the original Instagram post for instructions.',
    ingredients,
    ingredientGroups: getIngredientGroups(ingredients),
    imageUrl: data?.thumbnail_url,
    sourceUrl: url,
    sourcePlatform: 'instagram',
    confidence: ingredients.length > 2 ? 'medium' : 'low',
    rawText: caption,
  }
}

function extractPostId(url: string): string {
  const match = url.match(/\/(p|reel|tv)\/([A-Za-z0-9_-]+)/)
  return match?.[2] ?? ''
}

function extractUsername(url: string): string {
  const match = url.match(/instagram\.com\/([^/?]+)/)
  return match?.[1] ?? ''
}
