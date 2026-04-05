import { load, type CheerioAPI } from 'cheerio'
import {
  FETCH_HEADERS,
  parseDuration,
  parseIngredientList,
  parseIngredientString,
  getIngredientGroups,
  isIngredientHeading,
  parseNutritionValue,
  parseNutritionFromText,
  type ScrapedIngredient,
  type ScrapedNutrition,
  type ScrapedRecipe,
} from './utils'

// ─── Schema.org types ─────────────────────────────────────────────────────────

interface SchemaRecipe {
  '@type': string | string[]
  name?: string
  description?: string
  recipeInstructions?: unknown
  recipeIngredient?: string[]
  prepTime?: string
  cookTime?: string
  totalTime?: string
  recipeYield?: string | number | string[]
  image?: string | string[] | { url?: string }
  thumbnailUrl?: string
  nutrition?: {
    '@type'?: string
    calories?: string | number
    carbohydrateContent?: string | number
    proteinContent?: string | number
    fatContent?: string | number
    fiberContent?: string | number
    sodiumContent?: string | number
    sugarContent?: string | number
    saturatedFatContent?: string | number
    cholesterolContent?: string | number
    servingSize?: string
  }
}

interface HowToStep {
  '@type'?: string
  text?: string
  name?: string
}

interface HowToSection {
  '@type'?: string
  name?: string
  itemListElement?: HowToStep[]
}

// ─── JSON-LD parsers ──────────────────────────────────────────────────────────

/**
 * Normalize recipeInstructions which can be:
 * - A plain string
 * - An array of strings
 * - An array of HowToStep objects
 * - An array of HowToSection objects (each containing HowToStep items)
 */
function normalizeInstructions(raw: unknown): string {
  if (!raw) return ''
  if (typeof raw === 'string') return raw

  if (!Array.isArray(raw)) return ''

  const lines: string[] = []
  let stepNum = 1

  for (const item of raw) {
    if (typeof item === 'string') {
      lines.push(`${stepNum}. ${item.trim()}`)
      stepNum++
      continue
    }
    if (typeof item !== 'object' || !item) continue

    const typed = item as HowToSection & HowToStep
    const type = typed['@type'] ?? ''

    if (type === 'HowToSection' && Array.isArray(typed.itemListElement)) {
      // Section with a name heading and nested steps
      if (typed.name) lines.push(`\n${typed.name}:`)
      for (const step of typed.itemListElement) {
        const text = step.text ?? step.name
        if (text) {
          lines.push(`${stepNum}. ${text.trim()}`)
          stepNum++
        }
      }
    } else {
      // HowToStep or bare object
      const text = typed.text ?? typed.name
      if (text) {
        lines.push(`${stepNum}. ${text.trim()}`)
        stepNum++
      }
    }
  }

  return lines.filter(Boolean).join('\n')
}

function normalizeImage(image: SchemaRecipe['image']): string | undefined {
  if (!image) return undefined
  if (typeof image === 'string') return image
  if (Array.isArray(image)) {
    const first = image[0]
    return typeof first === 'string' ? first : (first as { url?: string })?.url
  }
  if (typeof image === 'object') return (image as { url?: string }).url
  return undefined
}

function normalizeYield(y: SchemaRecipe['recipeYield']): number | undefined {
  if (!y) return undefined
  const str = Array.isArray(y) ? y[0] : String(y)
  const match = str.match(/\d+/)
  return match ? parseInt(match[0]) : undefined
}

function extractNutritionFromSchema(n: SchemaRecipe['nutrition']): ScrapedNutrition | undefined {
  if (!n) return undefined
  const calories = parseNutritionValue(n.calories)
  if (!calories) return undefined
  return {
    calories,
    proteinG: parseNutritionValue(n.proteinContent),
    carbsG: parseNutritionValue(n.carbohydrateContent),
    fatG: parseNutritionValue(n.fatContent),
    fiberG: parseNutritionValue(n.fiberContent),
    sodiumMg: parseNutritionValue(n.sodiumContent),
    sugarG: parseNutritionValue(n.sugarContent),
    saturatedFatG: parseNutritionValue(n.saturatedFatContent),
    cholesterolMg: parseNutritionValue(n.cholesterolContent),
    servingSize: n.servingSize,
  }
}

function extractFromJsonLd(html: string): SchemaRecipe | null {
  const $ = load(html)
  const scripts = $('script[type="application/ld+json"]')

  for (let i = 0; i < scripts.length; i++) {
    try {
      const text = $(scripts[i]).html() ?? ''
      const json = JSON.parse(text)

      const candidates: SchemaRecipe[] = []
      if (json['@graph']) candidates.push(...json['@graph'])
      else candidates.push(json)

      for (const candidate of candidates) {
        const type = candidate['@type']
        const types = Array.isArray(type) ? type : [type]
        if (types.includes('Recipe')) return candidate as SchemaRecipe
      }
    } catch {
      // continue to next script tag
    }
  }
  return null
}

// ─── HTML fallback extractors ─────────────────────────────────────────────────

/**
 * Extract ingredients from HTML, respecting section headings.
 * Tries common CSS selectors used by popular recipe plugins.
 */
function extractIngredientsFromHtml($: CheerioAPI): ScrapedIngredient[] {
  const containerSelectors = [
    '[class*="ingredient"]:not(li):not(span)',
    '[id*="ingredient"]',
    '.wprm-recipe-ingredient-container',
    '.tasty-recipes-ingredients',
    '.recipe-ingredients',
    '[class*="Ingredient"]:not(li):not(span)',
  ]

  for (const selector of containerSelectors) {
    const container = $(selector).first()
    if (!container.length) continue

    const result: ScrapedIngredient[] = []
    let currentGroup: string | undefined

    // Walk direct children looking for headings and list items
    container.find('h2, h3, h4, strong, b, li, p, [class*="ingredient-group"]').each((_, el) => {
      const tag = ($(el).prop('tagName') as string | undefined)?.toLowerCase() ?? ''
      const text = $(el).text().trim().replace(/\s+/g, ' ')
      if (!text) return

      const isHeadingTag = ['h2', 'h3', 'h4'].includes(tag)
      const isBoldOnly =
        ['strong', 'b'].includes(tag) &&
        $(el).closest('li').length === 0 &&
        text.length < 80

      if (isHeadingTag || isBoldOnly || isIngredientHeading(text)) {
        currentGroup = text.replace(/:$/, '').trim()
        return
      }

      if (['li', 'p'].includes(tag)) {
        const cleaned = text.replace(/^[▢□✓✗•·–\-]\s*/u, '').trim()
        if (cleaned && cleaned.length > 1 && !isIngredientHeading(cleaned)) {
          result.push({ ...parseIngredientString(cleaned), group: currentGroup })
        }
      }
    })

    if (result.length > 0) return result
  }

  // Last resort: find any list that lives near an "Ingredients" heading
  let found: ScrapedIngredient[] = []
  $('h2, h3, h4').each((_, heading) => {
    if (found.length > 0) return
    const headingText = $(heading).text().toLowerCase().trim()
    if (!headingText.includes('ingredient')) return

    // Gather list items that follow this heading
    let currentGroup: string | undefined
    const items: ScrapedIngredient[] = []
    let el = $(heading).next()

    while (el.length && !['h2', 'h3'].includes((el.prop('tagName') as string | '').toLowerCase())) {
      const tag = (el.prop('tagName') as string | '').toLowerCase()
      if (tag === 'ul' || tag === 'ol') {
        el.find('li').each((_, li) => {
          const text = $(li).text().trim().replace(/^[▢□✓•]\s*/u, '')
          if (isIngredientHeading(text)) {
            currentGroup = text.replace(/:$/, '').trim()
          } else if (text) {
            items.push({ ...parseIngredientString(text), group: currentGroup })
          }
        })
      } else {
        const text = el.text().trim()
        if (isIngredientHeading(text)) {
          currentGroup = text.replace(/:$/, '').trim()
        }
      }
      el = el.next()
    }

    if (items.length > 0) found = items
  })

  return found
}

/**
 * Extract instructions from HTML, handling section headings within instructions.
 */
function extractInstructionsFromHtml($: CheerioAPI): string {
  const containerSelectors = [
    '[class*="instruction"]:not(li):not(span)',
    '[class*="direction"]:not(li):not(span)',
    '[id*="instruction"]',
    '[id*="direction"]',
    '.wprm-recipe-instructions',
    '.tasty-recipes-instructions-body',
    '.recipe-directions',
    '[class*="steps"]:not(li)',
    '[class*="method"]:not(li)',
  ]

  for (const selector of containerSelectors) {
    const container = $(selector).first()
    if (!container.length) continue

    const lines: string[] = []
    let stepNum = 1
    let currentSection: string | undefined

    container.find('li, p, [class*="step"]').each((_, el) => {
      const text = $(el).text().trim().replace(/\s+/g, ' ')
      if (!text || text.length < 5) return

      // Look for a bold/heading child that IS the whole text (section label)
      const boldChild = $(el).find('strong, b, em').first()
      if (boldChild.length && boldChild.text().trim() === text && text.length < 80) {
        currentSection = text
        return
      }

      const prefix = currentSection ? '' : ''
      lines.push(`${stepNum}. ${text}`)
      stepNum++
    })

    if (lines.length > 0) return lines.join('\n')
  }

  // Fallback: find an Instructions heading and collect what follows
  let found = ''
  $('h2, h3, h4').each((_, heading) => {
    if (found) return
    const headingText = $(heading).text().toLowerCase().trim()
    if (!headingText.includes('instruction') && !headingText.includes('direction') && !headingText.includes('method')) return

    const lines: string[] = []
    let stepNum = 1
    let el = $(heading).next()

    while (el.length && !['h2', 'h3'].includes((el.prop('tagName') as string | '').toLowerCase())) {
      const tag = (el.prop('tagName') as string | '').toLowerCase()
      if (tag === 'ol' || tag === 'ul') {
        el.find('li').each((_, li) => {
          const text = $(li).text().trim().replace(/\s+/g, ' ')
          if (text) { lines.push(`${stepNum}. ${text}`); stepNum++ }
        })
      } else if (tag === 'p') {
        const text = el.text().trim()
        if (text && text.length > 10) { lines.push(`${stepNum}. ${text}`); stepNum++ }
      }
      el = el.next()
    }

    if (lines.length > 0) found = lines.join('\n')
  })

  return found
}

/**
 * Extract nutrition facts from HTML.
 * Tries structured containers first, then a text-based search near "Nutrition" headings.
 */
function extractNutritionFromHtml($: CheerioAPI): ScrapedNutrition | undefined {
  const containerSelectors = [
    '[class*="nutrition"]:not(script)',
    '[id*="nutrition"]',
    '.wprm-nutrition-label',
    '.tasty-recipes-nutrition',
    '.recipe-nutrition',
    '[class*="Nutrition"]:not(script)',
  ]

  for (const selector of containerSelectors) {
    const container = $(selector).first()
    if (!container.length) continue
    const text = container.text().replace(/\s+/g, ' ')
    const result = parseNutritionFromText(text)
    if (result) return result
  }

  // Scan for a "Nutrition" heading and read the text that follows
  let result: ScrapedNutrition | undefined
  $('h2, h3, h4, p, strong, b').each((_, el) => {
    if (result) return
    const text = $(el).text().toLowerCase().trim()
    if (text !== 'nutrition' && !text.startsWith('nutrition info')) return

    // Grab the next sibling's text
    const nextText = $(el).next().text().replace(/\s+/g, ' ').trim()
    if (nextText) result = parseNutritionFromText(nextText)

    // Or grab the parent's text
    if (!result) {
      const parentText = $(el).parent().text().replace(/\s+/g, ' ').trim()
      result = parseNutritionFromText(parentText)
    }
  })

  return result
}

// ─── Error handling ───────────────────────────────────────────────────────────

const ERROR_MESSAGES: Record<number, string> = {
  401: 'This page requires login. Try copying the recipe URL after signing in on that site.',
  402: 'This site requires a subscription or payment to access recipes.',
  403: 'This site is blocking automated access. Try a different recipe site.',
  404: 'Page not found. Double-check the URL.',
  429: 'This site is rate-limiting requests. Wait a minute and try again.',
  500: 'The recipe site is having server issues. Try again later.',
  503: 'The recipe site is temporarily unavailable. Try again later.',
}

const EXTENDED_HEADERS = {
  ...FETCH_HEADERS,
  'Cache-Control': 'no-cache',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Upgrade-Insecure-Requests': '1',
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function scrapeWebRecipe(url: string): Promise<ScrapedRecipe> {
  let res = await fetch(url, {
    headers: EXTENDED_HEADERS,
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok && (res.status === 402 || res.status === 403)) {
    res = await fetch(url, {
      headers: { 'User-Agent': FETCH_HEADERS['User-Agent'] },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    })
  }

  if (!res.ok) {
    const friendly = ERROR_MESSAGES[res.status]
    throw new Error(
      friendly ?? `This site returned an error (HTTP ${res.status}). It may be blocking imports.`
    )
  }

  const html = await res.text()
  const $ = load(html)

  // ── 1. Try JSON-LD ──────────────────────────────────────────────────────────
  const schema = extractFromJsonLd(html)

  if (schema?.name) {
    const ingredients = parseIngredientList(schema.recipeIngredient ?? [])

    // If JSON-LD gave us no ingredients, fall back to HTML extraction
    const finalIngredients =
      ingredients.length > 0 ? ingredients : extractIngredientsFromHtml($)

    const instructions = normalizeInstructions(schema.recipeInstructions) || extractInstructionsFromHtml($)
    const nutrition = extractNutritionFromSchema(schema.nutrition) ?? extractNutritionFromHtml($)

    return {
      title: schema.name,
      description: schema.description,
      instructions,
      ingredients: finalIngredients,
      ingredientGroups: getIngredientGroups(finalIngredients),
      prepTime: parseDuration(schema.prepTime ?? ''),
      cookTime: parseDuration(schema.cookTime ?? ''),
      servings: normalizeYield(schema.recipeYield),
      imageUrl:
        normalizeImage(schema.image) ??
        (typeof schema.thumbnailUrl === 'string' ? schema.thumbnailUrl : undefined),
      scrapedNutrition: nutrition,
      sourceUrl: url,
      sourcePlatform: 'web',
      confidence: 'high',
    }
  }

  // ── 2. HTML extraction fallback ─────────────────────────────────────────────
  const ingredients = extractIngredientsFromHtml($)
  const instructions = extractInstructionsFromHtml($)
  const nutrition = extractNutritionFromHtml($)

  const title =
    $('meta[property="og:title"]').attr('content') ??
    $('title').text().trim() ??
    'Imported Recipe'
  const description =
    $('meta[property="og:description"]').attr('content') ??
    $('meta[name="description"]').attr('content')
  const imageUrl = $('meta[property="og:image"]').attr('content')

  if (ingredients.length > 0 || instructions) {
    return {
      title: title.replace(/\s*[-|].*$/, '').trim(),
      description,
      instructions,
      ingredients,
      ingredientGroups: getIngredientGroups(ingredients),
      imageUrl,
      scrapedNutrition: nutrition,
      sourceUrl: url,
      sourcePlatform: 'web',
      confidence: ingredients.length > 3 ? 'medium' : 'low',
    }
  }

  // ── 3. Last resort: raw text ────────────────────────────────────────────────
  $('script, style, nav, header, footer, aside').remove()
  const rawText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 3000)

  return {
    title: title.replace(/\s*[-|].*$/, '').trim(),
    description,
    instructions: '',
    ingredients: [],
    ingredientGroups: [],
    imageUrl,
    scrapedNutrition: nutrition,
    sourceUrl: url,
    sourcePlatform: 'web',
    confidence: 'low',
    rawText,
  }
}
