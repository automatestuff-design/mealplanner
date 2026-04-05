export type ScrapedIngredient = {
  name: string
  quantity: number
  unit: string
  notes?: string
}

export type ScrapedRecipe = {
  title: string
  description?: string
  instructions: string
  ingredients: ScrapedIngredient[]
  prepTime?: number
  cookTime?: number
  servings?: number
  imageUrl?: string
  sourceUrl: string
  sourcePlatform: 'web' | 'tiktok' | 'pinterest' | 'instagram'
  confidence: 'high' | 'medium' | 'low'
  rawText?: string // for low-confidence extractions the user can review
}

export const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  Connection: 'keep-alive',
}

export function detectPlatform(url: string): 'tiktok' | 'pinterest' | 'instagram' | 'web' {
  if (url.includes('tiktok.com')) return 'tiktok'
  if (url.includes('pinterest.com') || url.includes('pin.it')) return 'pinterest'
  if (url.includes('instagram.com')) return 'instagram'
  return 'web'
}

/**
 * Parse an ISO 8601 duration string (PT15M, PT1H30M) to minutes.
 */
export function parseDuration(iso: string): number | undefined {
  if (!iso) return undefined
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return undefined
  const hours = parseInt(match[1] ?? '0')
  const minutes = parseInt(match[2] ?? '0')
  return hours * 60 + minutes || undefined
}

/**
 * Parse ingredient strings like "2 cups flour" or "1/2 tsp salt" into structured data.
 */
export function parseIngredientString(raw: string): ScrapedIngredient {
  const cleaned = raw.trim().replace(/\s+/g, ' ')

  // Fraction to decimal map
  const fractions: Record<string, number> = {
    '½': 0.5, '⅓': 0.333, '⅔': 0.667, '¼': 0.25, '¾': 0.75,
    '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
    '1/2': 0.5, '1/3': 0.333, '2/3': 0.667, '1/4': 0.25,
    '3/4': 0.75, '1/8': 0.125, '1/6': 0.167,
  }

  let text = cleaned
  for (const [frac, val] of Object.entries(fractions)) {
    text = text.replace(frac, val.toString())
  }

  const units = [
    'tablespoons?', 'tbsp', 'teaspoons?', 'tsp', 'cups?', 'oz', 'ounces?',
    'lbs?', 'pounds?', 'grams?', 'g', 'kg', 'kilograms?', 'ml', 'milliliters?',
    'liters?', 'l', 'pints?', 'quarts?', 'gallons?', 'cans?', 'cloves?',
    'slices?', 'pieces?', 'whole', 'stalks?', 'sprigs?', 'bunches?', 'handfuls?',
  ]
  const unitPattern = units.join('|')
  const match = text.match(
    new RegExp(`^(\\d+(?:\\.\\d+)?(?:\\s*-\\s*\\d+(?:\\.\\d+)?)?)\\s*(${unitPattern})\\.?\\s+(.+)$`, 'i')
  )

  if (match) {
    const quantity = parseFloat(match[1].split('-')[0].trim())
    const unit = match[2].toLowerCase().replace(/s$/, '')
    const name = match[3].toLowerCase().trim()
    const noteMatch = name.match(/^(.+?),?\s*\((.+)\)$/)
    return {
      name: noteMatch ? noteMatch[1].trim() : name,
      quantity: isNaN(quantity) ? 1 : quantity,
      unit,
      notes: noteMatch ? noteMatch[2] : undefined,
    }
  }

  // Just a number at start without unit
  const simpleMatch = text.match(/^(\d+(?:\.\d+)?)\s+(.+)$/)
  if (simpleMatch) {
    return {
      name: simpleMatch[2].toLowerCase().trim(),
      quantity: parseFloat(simpleMatch[1]),
      unit: 'whole',
    }
  }

  // No quantity found — treat whole string as ingredient name
  return { name: cleaned.toLowerCase(), quantity: 1, unit: 'whole' }
}

/**
 * Try to extract ingredients from freeform text (e.g. TikTok captions).
 * Looks for lines that look like ingredients.
 */
export function extractIngredientsFromText(text: string): ScrapedIngredient[] {
  const lines = text.split(/\n|•|·|-(?=\s)/).map((l) => l.trim()).filter(Boolean)
  const ingredientLines = lines.filter((line) => {
    // Likely an ingredient if it starts with a number, fraction, or unit-like word
    return /^[\d½⅓⅔¼¾⅛]+/.test(line) || /^(a |an |some )/i.test(line)
  })
  return ingredientLines.map(parseIngredientString)
}

/**
 * Try to extract instructions from freeform text.
 * Looks for numbered steps or sentence groups.
 */
export function extractInstructionsFromText(text: string): string {
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean)
  // Find lines that look like steps
  const steps = lines.filter((l) => /^\d+[\.\)]/.test(l) || l.length > 40)
  return steps.length > 0 ? steps.join('\n') : text
}
