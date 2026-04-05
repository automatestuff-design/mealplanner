import { load } from 'cheerio'
import {
  FETCH_HEADERS,
  parseDuration,
  parseIngredientString,
  type ScrapedRecipe,
} from './utils'

// Schema.org Recipe JSON-LD type (partial)
interface SchemaRecipe {
  '@type': string | string[]
  name?: string
  description?: string
  recipeInstructions?: string | string[] | Array<{ text?: string; '@type'?: string }>
  recipeIngredient?: string[]
  prepTime?: string
  cookTime?: string
  totalTime?: string
  recipeYield?: string | number | string[]
  image?: string | string[] | { url?: string }
  thumbnailUrl?: string
}

function normalizeInstructions(raw: SchemaRecipe['recipeInstructions']): string {
  if (!raw) return ''
  if (typeof raw === 'string') return raw
  if (Array.isArray(raw)) {
    return raw
      .map((item, idx) => {
        if (typeof item === 'string') return `${idx + 1}. ${item}`
        if (typeof item === 'object' && item.text) return `${idx + 1}. ${item.text}`
        return ''
      })
      .filter(Boolean)
      .join('\n')
  }
  return ''
}

function normalizeImage(image: SchemaRecipe['image']): string | undefined {
  if (!image) return undefined
  if (typeof image === 'string') return image
  if (Array.isArray(image)) return typeof image[0] === 'string' ? image[0] : (image[0] as { url?: string })?.url
  if (typeof image === 'object') return (image as { url?: string }).url
  return undefined
}

function normalizeYield(y: SchemaRecipe['recipeYield']): number | undefined {
  if (!y) return undefined
  const str = Array.isArray(y) ? y[0] : String(y)
  const match = str.match(/\d+/)
  return match ? parseInt(match[0]) : undefined
}

function extractFromJsonLd(html: string): SchemaRecipe | null {
  const $ = load(html)
  const scripts = $('script[type="application/ld+json"]')

  for (let i = 0; i < scripts.length; i++) {
    try {
      const text = $(scripts[i]).html() ?? ''
      const json = JSON.parse(text)

      // Handle @graph arrays
      const candidates: SchemaRecipe[] = []
      if (json['@graph']) candidates.push(...json['@graph'])
      else candidates.push(json)

      for (const candidate of candidates) {
        const type = candidate['@type']
        const types = Array.isArray(type) ? type : [type]
        if (types.includes('Recipe')) return candidate as SchemaRecipe
      }
    } catch {
      // continue
    }
  }
  return null
}

function extractFromMicrodata(html: string): Partial<SchemaRecipe> | null {
  const $ = load(html)
  const recipeEl = $('[itemtype*="schema.org/Recipe"]').first()
  if (!recipeEl.length) return null

  return {
    name: recipeEl.find('[itemprop="name"]').first().text().trim() || undefined,
    description: recipeEl.find('[itemprop="description"]').first().text().trim() || undefined,
    recipeIngredient: recipeEl
      .find('[itemprop="recipeIngredient"]')
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(Boolean),
    recipeInstructions: recipeEl
      .find('[itemprop="recipeInstructions"]')
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(Boolean),
  }
}

const ERROR_MESSAGES: Record<number, string> = {
  401: 'This page requires login. Try copying the recipe URL after signing in on that site.',
  402: 'This site requires a subscription or payment to access recipes.',
  403: 'This site is blocking automated access. Try a different recipe site.',
  404: 'Page not found. Double-check the URL.',
  429: 'This site is rate-limiting requests. Wait a minute and try again.',
  500: 'The recipe site is having server issues. Try again later.',
  503: 'The recipe site is temporarily unavailable. Try again later.',
}

// Additional headers that help bypass basic bot detection
const EXTENDED_HEADERS = {
  ...FETCH_HEADERS,
  'Cache-Control': 'no-cache',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Upgrade-Insecure-Requests': '1',
}

export async function scrapeWebRecipe(url: string): Promise<ScrapedRecipe> {
  let res = await fetch(url, {
    headers: EXTENDED_HEADERS,
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
  })

  // Retry once with minimal headers if blocked
  if (!res.ok && (res.status === 402 || res.status === 403)) {
    res = await fetch(url, {
      headers: { 'User-Agent': FETCH_HEADERS['User-Agent'] },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    })
  }

  if (!res.ok) {
    const friendly = ERROR_MESSAGES[res.status]
    throw new Error(friendly ?? `This site returned an error (HTTP ${res.status}). It may be blocking imports.`)
  }
  const html = await res.text()

  // 1. Try JSON-LD
  const schema = extractFromJsonLd(html) ?? extractFromMicrodata(html)

  if (schema?.name) {
    return {
      title: schema.name ?? 'Untitled Recipe',
      description: schema.description,
      instructions: normalizeInstructions(schema.recipeInstructions),
      ingredients: (schema.recipeIngredient ?? []).map(parseIngredientString),
      prepTime: parseDuration(schema.prepTime ?? ''),
      cookTime: parseDuration(schema.cookTime ?? ''),
      servings: normalizeYield(schema.recipeYield),
      imageUrl: normalizeImage(schema.image) ?? (typeof schema.thumbnailUrl === 'string' ? schema.thumbnailUrl : undefined),
      sourceUrl: url,
      sourcePlatform: 'web',
      confidence: 'high',
    }
  }

  // 2. Fallback: grab page title and visible text
  const $ = load(html)
  const title =
    $('meta[property="og:title"]').attr('content') ??
    $('title').text().trim() ??
    'Imported Recipe'
  const description =
    $('meta[property="og:description"]').attr('content') ??
    $('meta[name="description"]').attr('content')
  const imageUrl = $('meta[property="og:image"]').attr('content')

  // Grab body text for manual review
  $('script, style, nav, header, footer, aside').remove()
  const rawText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 3000)

  return {
    title: title.replace(/\s*[-|].*$/, '').trim(),
    description,
    instructions: '',
    ingredients: [],
    imageUrl,
    sourceUrl: url,
    sourcePlatform: 'web',
    confidence: 'low',
    rawText,
  }
}
