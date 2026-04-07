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
 * Strip HTML tags and decode common HTML entities from a string.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * Normalize recipeInstructions which can be:
 * - A plain string (possibly HTML)
 * - An array of strings
 * - An array of HowToStep objects
 * - An array of HowToSection objects (each containing HowToStep items)
 */
function normalizeInstructions(raw: unknown): string {
  if (!raw) return ''
  if (typeof raw === 'string') {
    // Some sites embed HTML in the string — strip tags and number the sentences/lines
    const clean = stripHtml(raw)
    // If it already has numbered steps, return as-is
    if (/^\s*\d+[\.\)]/.test(clean)) return clean
    // Split on sentence boundaries or newlines and number them
    const sentences = clean
      .split(/\.\s+|\n+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10)
    return sentences.length > 1
      ? sentences.map((s, i) => `${i + 1}. ${s.endsWith('.') ? s : s + '.'}`).join('\n')
      : clean
  }

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
        const raw = step.text ?? step.name
        if (raw) {
          const text = stripHtml(raw).trim()
          if (text) { lines.push(`${stepNum}. ${text}`); stepNum++ }
        }
      }
    } else {
      // HowToStep or bare object — strip any embedded HTML
      const raw = typed.text ?? typed.name
      if (raw) {
        const text = stripHtml(raw).trim()
        if (text) { lines.push(`${stepNum}. ${text}`); stepNum++ }
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
 * Extract ingredients using WPRM's structured markup.
 * Groups come from li.wprm-recipe-ingredient-group >
 *   span.wprm-recipe-ingredient-group-name
 * Individual ingredients come from li.wprm-recipe-ingredient with
 *   separate amount/unit/name/notes spans.
 */
function extractWprmIngredients($: CheerioAPI): ScrapedIngredient[] {
  const groups = $('li.wprm-recipe-ingredient-group')
  if (!groups.length) return []

  const result: ScrapedIngredient[] = []

  groups.each((_, groupEl) => {
    const groupName = $(groupEl)
      .find('.wprm-recipe-ingredient-group-name')
      .first()
      .text()
      .trim()
      .replace(/:$/, '') || undefined

    $(groupEl)
      .find('li.wprm-recipe-ingredient')
      .each((_, ingEl) => {
        const amount = $(ingEl).find('.wprm-recipe-ingredient-amount').text().trim()
        const unit = $(ingEl).find('.wprm-recipe-ingredient-unit').text().trim()
        const name = $(ingEl).find('.wprm-recipe-ingredient-name').text().trim()
        const notes = $(ingEl).find('.wprm-recipe-ingredient-notes').text().trim().replace(/^\(|\)$/g, '')

        if (!name) return

        // Parse amount — handle fractions like "1 ½"
        const fractionMap: Record<string, number> = {
          '½': 0.5, '⅓': 0.333, '⅔': 0.667, '¼': 0.25, '¾': 0.75,
          '⅛': 0.125, '1/2': 0.5, '1/3': 0.333, '2/3': 0.667,
          '1/4': 0.25, '3/4': 0.75,
        }
        let quantityStr = amount
        for (const [frac, val] of Object.entries(fractionMap)) {
          quantityStr = quantityStr.replace(frac, val.toString())
        }
        const parts = quantityStr.trim().split(/\s+/)
        const quantity = parts.reduce((sum, p) => sum + (parseFloat(p) || 0), 0) || 1

        result.push({
          name: name.toLowerCase().trim(),
          quantity,
          unit: unit.toLowerCase() || 'whole',
          notes: notes || undefined,
          group: groupName,
        })
      })
  })

  return result
}

/**
 * Extract ingredients from HTML, respecting section headings.
 * Tries common CSS selectors used by popular recipe plugins.
 */
function extractIngredientsFromHtml($: CheerioAPI): ScrapedIngredient[] {
  // ── 1. WPRM-specific structured extraction ──────────────────────────────────
  const wprmResult = extractWprmIngredients($)
  if (wprmResult.length > 0) return wprmResult

  // ── 2. Tasty Recipes plugin ──────────────────────────────────────────────────
  const tastyContainer = $('.tasty-recipes-ingredients').first()
  if (tastyContainer.length) {
    const result: ScrapedIngredient[] = []
    let currentGroup: string | undefined
    tastyContainer.find('h4, li').each((_, el) => {
      const tag = ($(el).prop('tagName') as string).toLowerCase()
      const text = $(el).text().trim().replace(/^[▢□✓✗•·–\-]\s*/u, '').replace(/\s+/g, ' ')
      if (!text) return
      if (tag === 'h4') {
        currentGroup = text.replace(/:$/, '').trim()
      } else if (tag === 'li' && !isIngredientHeading(text)) {
        result.push({ ...parseIngredientString(text), group: currentGroup })
      }
    })
    if (result.length > 0) return result
  }

  // ── 3. Generic CSS container selectors ─────────────────────────────────────
  const containerSelectors = [
    '[class*="ingredient"]:not(li):not(span)',
    '[id*="ingredient"]',
    '.recipe-ingredients',
    '[class*="Ingredient"]:not(li):not(span)',
  ]

  for (const selector of containerSelectors) {
    const container = $(selector).first()
    if (!container.length) continue

    const result: ScrapedIngredient[] = []
    let currentGroup: string | undefined

    // Walk children looking for group-name spans/headings, and ingredient list items.
    // Skip li elements that contain nested lists (they are group wrappers).
    container.find('h2, h3, h4, [class*="group-name"], strong, b, li, p').each((_, el) => {
      const tag = ($(el).prop('tagName') as string | undefined)?.toLowerCase() ?? ''
      const text = $(el).text().trim().replace(/\s+/g, ' ')
      if (!text) return

      // Skip group-wrapper li elements (contain a nested ul/ol)
      if (tag === 'li' && $(el).find('ul, ol').length > 0) return

      const isHeadingTag = ['h2', 'h3', 'h4'].includes(tag)
      const isGroupSpan = $(el).attr('class')?.includes('group-name') ?? false
      const isBoldOnly =
        ['strong', 'b'].includes(tag) &&
        $(el).closest('li').length === 0 &&
        text.length < 80

      if (isHeadingTag || isGroupSpan || isBoldOnly || isIngredientHeading(text)) {
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

  // ── 4. Heading-based fallback ────────────────────────────────────────────────
  let found: ScrapedIngredient[] = []
  $('h2, h3, h4').each((_, heading) => {
    if (found.length > 0) return
    const headingText = $(heading).text().toLowerCase().trim()
    if (!headingText.includes('ingredient')) return

    let currentGroup: string | undefined
    const items: ScrapedIngredient[] = []
    let el = $(heading).next()

    while (el.length && !['h2', 'h3'].includes((el.prop('tagName') as string | '').toLowerCase())) {
      const tag = (el.prop('tagName') as string | '').toLowerCase()
      if (tag === 'ul' || tag === 'ol') {
        el.find('li').each((_, li) => {
          // Skip wrapper li elements
          if ($(li).find('ul, ol').length > 0) return
          const text = $(li).text().trim().replace(/^[▢□✓•]\s*/u, '').replace(/\s+/g, ' ')
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
 * Get the text of a list item without including text from nested lists.
 * WPRM wraps steps in li.wprm-recipe-instruction > div.wprm-recipe-instruction-text
 * and also has group li elements that nest the step lis — we must skip those.
 */
function liText($: CheerioAPI, el: ReturnType<typeof $>[number]): string {
  const $el = $(el)
  // If this li contains a nested ol/ul, it's a group container — skip it
  if ($el.find('ol, ul').length > 0) return ''
  // Prefer the WPRM instruction-text div if present
  const textDiv = $el.find('[class*="instruction-text"], [class*="step-text"]').first()
  if (textDiv.length) return textDiv.text().trim().replace(/\s+/g, ' ')
  return $el.text().trim().replace(/\s+/g, ' ')
}

/**
 * Extract instructions from HTML, handling section headings within instructions.
 */
function extractInstructionsFromHtml($: CheerioAPI): string {
  // ── 1. WPRM-specific: li.wprm-recipe-instruction ────────────────────────────
  const wprmItems = $('li.wprm-recipe-instruction')
  if (wprmItems.length > 0) {
    const lines: string[] = []
    wprmItems.each((i, el) => {
      const text = liText($, el)
      if (text && text.length > 4) lines.push(`${i + 1}. ${text}`)
    })
    if (lines.length > 0) return lines.join('\n')
  }

  // ── 2. Tasty Recipes plugin ──────────────────────────────────────────────────
  const tastyContainer = $('.tasty-recipes-instructions-body, .tasty-recipes-instructions').first()
  if (tastyContainer.length) {
    const lines: string[] = []
    let stepNum = 1
    tastyContainer.find('li').each((_, el) => {
      const text = liText($, el)
      if (text && text.length > 4) { lines.push(`${stepNum}. ${text}`); stepNum++ }
    })
    if (lines.length > 0) return lines.join('\n')
  }

  // ── 3. Generic CSS selectors ────────────────────────────────────────────────
  const containerSelectors = [
    '.wprm-recipe-instructions-container',
    '[class*="instruction"]:not(li):not(span):not(div > ol):not(div > ul)',
    '[class*="direction"]:not(li):not(span)',
    '[id*="instruction"]',
    '[id*="direction"]',
    '.recipe-directions',
    '[class*="steps"]:not(li)',
    '[class*="method"]:not(li)',
  ]

  for (const selector of containerSelectors) {
    const container = $(selector).first()
    if (!container.length) continue

    const lines: string[] = []
    let stepNum = 1

    // Only process leaf li/p elements (those without nested lists)
    container.find('li, p').each((_, el) => {
      const tag = ($(el).prop('tagName') as string).toLowerCase()
      let text: string
      if (tag === 'li') {
        text = liText($, el)
      } else {
        text = $(el).text().trim().replace(/\s+/g, ' ')
      }
      if (!text || text.length < 5) return
      lines.push(`${stepNum}. ${text}`)
      stepNum++
    })

    if (lines.length > 0) return lines.join('\n')
  }

  // ── 4. Heading-based fallback ────────────────────────────────────────────────
  let found = ''
  $('h2, h3, h4').each((_, heading) => {
    if (found) return
    const headingText = $(heading).text().toLowerCase().trim()
    if (
      !headingText.includes('instruction') &&
      !headingText.includes('direction') &&
      !headingText.includes('method') &&
      !headingText.includes('how to')
    ) return

    const lines: string[] = []
    let stepNum = 1
    let el = $(heading).next()

    while (el.length && !['h2', 'h3'].includes((el.prop('tagName') as string | '').toLowerCase())) {
      const tag = (el.prop('tagName') as string | '').toLowerCase()
      if (tag === 'ol' || tag === 'ul') {
        el.find('li').each((_, li) => {
          const text = liText($, li)
          if (text && text.length > 4) { lines.push(`${stepNum}. ${text}`); stepNum++ }
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
  'Sec-CH-UA': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  'Sec-CH-UA-Mobile': '?0',
  'Sec-CH-UA-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
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
    const jsonLdIngredients = parseIngredientList(schema.recipeIngredient ?? [])

    // Prefer JSON-LD ingredients, but if they have no groups, try HTML —
    // some plugins (WPRM) omit section headings from the JSON-LD flat array
    // even though they structure them clearly in the HTML.
    let finalIngredients = jsonLdIngredients.length > 0
      ? jsonLdIngredients
      : extractIngredientsFromHtml($)

    if (jsonLdIngredients.length > 0 && getIngredientGroups(jsonLdIngredients).length === 0) {
      const htmlIngredients = extractIngredientsFromHtml($)
      if (getIngredientGroups(htmlIngredients).length > 0) {
        finalIngredients = htmlIngredients
      }
    }

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
