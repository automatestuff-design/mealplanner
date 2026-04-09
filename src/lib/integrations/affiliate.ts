/**
 * Affiliate deep-link builders for grocery retailers.
 *
 * These use NEXT_PUBLIC_ env vars so they are safe to call from the browser.
 * No API keys required — just URL construction.
 *
 * Revenue:
 *   Amazon  — ~1% commission via Amazon Associates (affiliate-program.amazon.com)
 *   Walmart — ~1% commission via Impact/CJ Affiliate
 *   Instacart — 5% cart value + up to $10 CPA for new users (instacart.com/developers)
 */

function encode(query: string): string {
  return encodeURIComponent(query.trim())
}

/**
 * Amazon product search URL with optional affiliate tag.
 * Opens Amazon's search results page for the given query.
 */
export function amazonSearchUrl(query: string): string {
  const tag = process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG
  const base = `https://www.amazon.com/s?k=${encode(query)}`
  return tag ? `${base}&tag=${tag}` : base
}

/**
 * Walmart grocery search URL with optional affiliate ID.
 */
export function walmartSearchUrl(query: string): string {
  const affiliateId = process.env.NEXT_PUBLIC_WALMART_AFFILIATE_ID
  const base = `https://www.walmart.com/search?q=${encode(query)}`
  return affiliateId ? `${base}&wpa_ref=${affiliateId}` : base
}

/**
 * Instacart store search URL — used as a fallback when the IDP API is not
 * configured. Does NOT pre-fill a cart but still passes through affiliate
 * attribution if the user has clicked an Instacart affiliate link before.
 */
export function instacartSearchUrl(query: string): string {
  return `https://www.instacart.com/store/s?k=${encode(query)}`
}
