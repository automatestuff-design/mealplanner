import { extractIngredientsFromText, extractInstructionsFromText, type ScrapedRecipe } from './utils'

interface TikTokOEmbed {
  title?: string
  author_name?: string
  thumbnail_url?: string
  html?: string
}

export async function scrapeTikTok(url: string): Promise<ScrapedRecipe> {
  // TikTok's official oEmbed endpoint — no auth required for public videos
  const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`

  const res = await fetch(oembedUrl, {
    signal: AbortSignal.timeout(10000),
  })

  if (!res.ok) {
    throw new Error(`TikTok oEmbed returned ${res.status}. The video may be private or the URL is invalid.`)
  }

  const data: TikTokOEmbed = await res.json()

  // The oEmbed title is usually "<recipe name> by @author" or the caption excerpt
  const title = (data.title ?? 'TikTok Recipe')
    .replace(/#\w+/g, '') // strip hashtags
    .replace(/@\w+/g, '') // strip @mentions
    .trim()

  // TikTok doesn't expose full caption via oEmbed — we get what we can
  const ingredients = extractIngredientsFromText(data.title ?? '')
  const instructions = extractInstructionsFromText(data.title ?? '')

  return {
    title: title.slice(0, 200) || 'TikTok Recipe',
    description: `Imported from TikTok by ${data.author_name ?? 'unknown'}`,
    instructions: instructions || 'See the original TikTok video for instructions.',
    ingredients,
    imageUrl: data.thumbnail_url,
    sourceUrl: url,
    sourcePlatform: 'tiktok',
    confidence: ingredients.length > 0 ? 'medium' : 'low',
    rawText: data.title,
  }
}
