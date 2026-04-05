import { load } from 'cheerio'
import { FETCH_HEADERS, type ScrapedRecipe } from './utils'
import { scrapeWebRecipe } from './web'

interface PinterestOEmbed {
  title?: string
  provider_name?: string
  thumbnail_url?: string
  url?: string
}

async function resolveShortUrl(url: string): Promise<string> {
  // pin.it short links redirect to the full Pinterest URL
  const res = await fetch(url, {
    headers: FETCH_HEADERS,
    redirect: 'follow',
    signal: AbortSignal.timeout(10000),
  })
  return res.url
}

async function getSourceUrlFromPin(pinUrl: string): Promise<string | null> {
  try {
    const res = await fetch(pinUrl, {
      headers: FETCH_HEADERS,
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    })
    const html = await res.text()
    const $ = load(html)

    // Pinterest embeds the source URL in several places
    const candidates: string[] = []

    // 1. og:see_also or article:source
    const seeAlso = $('meta[property="og:see_also"]').attr('content')
    if (seeAlso) candidates.push(seeAlso)

    // 2. JSON-LD for the pin
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html() ?? '')
        if (json.url && !json.url.includes('pinterest.com')) candidates.push(json.url)
      } catch { /* ignore */ }
    })

    // 3. Links that go to external domains
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') ?? ''
      if (href.startsWith('http') && !href.includes('pinterest.com') && !href.includes('pin.it')) {
        candidates.push(href)
      }
    })

    return candidates.find((u) => u.startsWith('http')) ?? null
  } catch {
    return null
  }
}

export async function scrapePinterest(url: string): Promise<ScrapedRecipe> {
  // Resolve short URLs first
  const resolvedUrl = url.includes('pin.it') ? await resolveShortUrl(url) : url

  // Try Pinterest oEmbed for basic metadata
  let title: string | undefined
  let imageUrl: string | undefined
  try {
    const oembedUrl = `https://www.pinterest.com/oembed.json?url=${encodeURIComponent(resolvedUrl)}`
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(8000) })
    if (res.ok) {
      const data: PinterestOEmbed = await res.json()
      title = data.title
      imageUrl = data.thumbnail_url
    }
  } catch { /* ignore */ }

  // Try to find the source recipe URL from the pin page
  const sourceUrl = await getSourceUrlFromPin(resolvedUrl)

  if (sourceUrl) {
    try {
      // Scrape the actual recipe website the pin points to
      const recipe = await scrapeWebRecipe(sourceUrl)
      return {
        ...recipe,
        // Keep Pinterest image as fallback
        imageUrl: recipe.imageUrl ?? imageUrl,
        sourcePlatform: 'pinterest',
        sourceUrl: resolvedUrl,
      }
    } catch {
      // Fall through to low-confidence result
    }
  }

  return {
    title: title ?? 'Pinterest Recipe',
    description: 'Imported from Pinterest. Please fill in the recipe details.',
    instructions: '',
    ingredients: [],
    ingredientGroups: [],
    imageUrl,
    sourceUrl: resolvedUrl,
    sourcePlatform: 'pinterest',
    confidence: 'low',
    rawText: title,
  }
}
