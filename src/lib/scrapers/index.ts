import { detectPlatform, type ScrapedRecipe } from './utils'
import { scrapeWebRecipe } from './web'
import { scrapeTikTok } from './tiktok'
import { scrapePinterest } from './pinterest'
import { scrapeInstagram } from './instagram'

export type { ScrapedRecipe, ScrapedIngredient } from './utils'

export async function scrapeRecipeFromUrl(url: string): Promise<ScrapedRecipe> {
  const platform = detectPlatform(url)

  switch (platform) {
    case 'tiktok':
      return scrapeTikTok(url)
    case 'pinterest':
      return scrapePinterest(url)
    case 'instagram':
      return scrapeInstagram(url)
    default:
      return scrapeWebRecipe(url)
  }
}
