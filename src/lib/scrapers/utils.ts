export type ScrapedIngredient = {
  name: string
  quantity: number
  unit: string
  notes?: string
  group?: string // ingredient section heading e.g. "For the Banana Topping"
}

export type ScrapedNutrition = {
  calories?: number
  proteinG?: number
  carbsG?: number
  fatG?: number
  fiberG?: number
  sodiumMg?: number
  sugarG?: number
  saturatedFatG?: number
  cholesterolMg?: number
  servingSize?: string
}

export type ScrapedRecipe = {
  title: string
  description?: string
  instructions: string
  ingredients: ScrapedIngredient[]
  ingredientGroups: string[] // distinct group names, in order
  prepTime?: number
  cookTime?: number
  servings?: number
  imageUrl?: string
  scrapedNutrition?: ScrapedNutrition
  sourceUrl: string
  sourcePlatform: 'web' | 'tiktok' | 'pinterest' | 'instagram'
  confidence: 'high' | 'medium' | 'low'
  rawText?: string
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

/** Parse ISO 8601 duration (PT15M, PT1H30M) to minutes. */
export function parseDuration(iso: string): number | undefined {
  if (!iso) return undefined
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return undefined
  const hours = parseInt(match[1] ?? '0')
  const minutes = parseInt(match[2] ?? '0')
  return hours * 60 + minutes || undefined
}

/** Strip common recipe-site checkbox/bullet characters (▢ □ ✓ •). */
function stripLeadingSymbols(text: string): string {
  return text.replace(/^[▢□✓✗•·–\-]\s*/u, '').trim()
}

/** Returns true if the text looks like a section heading rather than an ingredient. */
export function isIngredientHeading(text: string): boolean {
  const t = text.trim()
  // Ends with colon, or is all caps short phrase, or matches common heading patterns
  return (
    (t.endsWith(':') && !/^[\d½⅓⅔¼¾⅛]/.test(t)) ||
    /^for the /i.test(t) ||
    /^(topping|sauce|filling|glaze|dough|batter|base|crust|frosting|garnish|marinade|dressing|syrup|coating|breading)s?[:\s]*$/i.test(t)
  )
}

/** Parse ingredient strings like "2 cups flour" or "1/2 tsp salt". */
export function parseIngredientString(raw: string): Omit<ScrapedIngredient, 'group'> {
  const cleaned = stripLeadingSymbols(raw.trim().replace(/\s+/g, ' '))

  const fractions: Record<string, number> = {
    '½': 0.5, '⅓': 0.333, '⅔': 0.667, '¼': 0.25, '¾': 0.75,
    '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
    '1/2': 0.5, '1/3': 0.333, '2/3': 0.667, '1/4': 0.25,
    '3/4': 0.75, '1/8': 0.125, '1/6': 0.167,
  }

  let text = cleaned
  for (const [frac, val] of Object.entries(fractions)) {
    text = text.replace(new RegExp(frac.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), val.toString())
  }

  const units = [
    'tablespoons?', 'tbsp', 'teaspoons?', 'tsp', 'cups?', 'oz', 'ounces?',
    'lbs?', 'pounds?', 'grams?', 'g', 'kg', 'kilograms?', 'ml', 'milliliters?',
    'liters?', 'l', 'pints?', 'quarts?', 'gallons?', 'cans?', 'cloves?',
    'slices?', 'pieces?', 'whole', 'stalks?', 'sprigs?', 'bunches?', 'handfuls?',
    'pinch(?:es)?', 'dash(?:es)?',
  ]
  const unitPattern = units.join('|')
  const match = text.match(
    new RegExp(`^(\\d+(?:\\.\\d+)?(?:\\s*[-–]\\s*\\d+(?:\\.\\d+)?)?)\\s*(${unitPattern})\\.?\\s+(.+)$`, 'i')
  )

  if (match) {
    const quantity = parseFloat(match[1].split(/[-–]/)[0].trim())
    const unit = match[2].toLowerCase().replace(/s$/, '').replace(/es$/, '')
    const name = match[3].trim()
    // Extract parenthetical notes like "(or milk of your choice)"
    const noteMatch = name.match(/^(.+?),?\s*\((.+)\)\s*$/)
    // Extract comma-separated notes like "fat-free milk, I use Fairlife"
    const commaNote = !noteMatch ? name.match(/^([^,]+),\s*(.{5,})$/) : null
    return {
      name: (noteMatch ? noteMatch[1] : commaNote ? commaNote[1] : name).toLowerCase().trim(),
      quantity: isNaN(quantity) ? 1 : quantity,
      unit,
      notes: noteMatch ? noteMatch[2] : commaNote ? commaNote[2] : undefined,
    }
  }

  const simpleMatch = text.match(/^(\d+(?:\.\d+)?)\s+(.+)$/)
  if (simpleMatch) {
    return {
      name: simpleMatch[2].toLowerCase().trim(),
      quantity: parseFloat(simpleMatch[1]),
      unit: 'whole',
    }
  }

  return { name: cleaned.toLowerCase(), quantity: 1, unit: 'whole' }
}

/**
 * Parse a flat ingredient array (from JSON-LD) that may contain section headings
 * mixed in with ingredient strings.
 */
export function parseIngredientList(raw: string[]): ScrapedIngredient[] {
  let currentGroup: string | undefined
  const result: ScrapedIngredient[] = []

  for (const item of raw) {
    const cleaned = stripLeadingSymbols(item.trim())
    if (!cleaned) continue

    if (isIngredientHeading(cleaned)) {
      currentGroup = cleaned.replace(/:$/, '').trim()
    } else {
      result.push({ ...parseIngredientString(cleaned), group: currentGroup })
    }
  }

  return result
}

/** Extract distinct ingredient group names in order. */
export function getIngredientGroups(ingredients: ScrapedIngredient[]): string[] {
  const seen = new Set<string>()
  const groups: string[] = []
  for (const ing of ingredients) {
    if (ing.group && !seen.has(ing.group)) {
      seen.add(ing.group)
      groups.push(ing.group)
    }
  }
  return groups
}

/** Parse a numeric value from strings like "11 g", "252 kcal", "195.5". */
export function parseNutritionValue(val: string | number | undefined): number | undefined {
  if (val === undefined || val === null) return undefined
  const str = String(val)
  const match = str.match(/[\d.]+/)
  return match ? parseFloat(match[0]) : undefined
}

/**
 * Parse nutrition facts from freeform text.
 * Handles patterns like:
 *   "Calories: 252 kcal, Protein: 11 g, Fat: 8 g"
 *   "Calories 252 | Carbohydrates 52g | Protein 11g"
 */
export function parseNutritionFromText(text: string): ScrapedNutrition | undefined {
  const calorieMatch = text.match(/calories?[:\s]+(\d+\.?\d*)/i)
  if (!calorieMatch) return undefined

  const extract = (pattern: RegExp): number | undefined => {
    const m = text.match(pattern)
    return m ? parseFloat(m[1]) : undefined
  }

  // Serving size: "Serving: 1 slice with bananas" or "Serving Size: 1 cup"
  const servingMatch = text.match(/serving(?:\s+size)?[:\s]+([^,\n|]+)/i)

  return {
    calories: parseInt(calorieMatch[1]),
    carbsG: extract(/carbohydrates?[:\s]+(\d+\.?\d*)\s*g/i),
    proteinG: extract(/protein[:\s]+(\d+\.?\d*)\s*g/i),
    fatG: extract(/(?:^|\s)(?:total\s+)?fat[:\s]+(\d+\.?\d*)\s*g/i),
    fiberG: extract(/(?:dietary\s+)?fiber[:\s]+(\d+\.?\d*)\s*g/i),
    sodiumMg: extract(/sodium[:\s]+(\d+\.?\d*)\s*mg/i),
    sugarG: extract(/sugar[:\s]+(\d+\.?\d*)\s*g/i),
    saturatedFatG: extract(/saturated\s+fat[:\s]+(\d+\.?\d*)\s*g/i),
    cholesterolMg: extract(/cholesterol[:\s]+(\d+\.?\d*)\s*mg/i),
    servingSize: servingMatch ? servingMatch[1].trim() : undefined,
  }
}

/** Extract ingredients from freeform text (e.g. TikTok captions). */
export function extractIngredientsFromText(text: string): ScrapedIngredient[] {
  const lines = text.split(/\n|•|·|-(?=\s)/).map((l) => l.trim()).filter(Boolean)
  const ingredientLines = lines.filter((line) =>
    /^[\d½⅓⅔¼¾⅛▢□]/.test(line) || /^(a |an |some )/i.test(line)
  )
  return ingredientLines.map((l) => ({ ...parseIngredientString(l) }))
}

/** Extract instructions from freeform text. */
export function extractInstructionsFromText(text: string): string {
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean)
  const steps = lines.filter((l) => /^\d+[\.\)]/.test(l) || l.length > 40)
  return steps.length > 0 ? steps.join('\n') : text
}
