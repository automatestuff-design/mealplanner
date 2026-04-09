/**
 * Instacart Developer Platform (IDP) client.
 *
 * API docs: https://docs.instacart.com/developer_platform_api/
 * Apply for a key: https://www.instacart.com/company/business/developers
 *
 * This module is SERVER-SIDE ONLY — the API key must never reach the browser.
 */

const INSTACART_API_BASE = 'https://connect.instacart.com'

export interface InstacartLineItem {
  /** Human-readable ingredient name, e.g. "whole milk" */
  name: string
  display_text?: string
  /** Numeric quantity */
  quantity: number
  /** Unit string, e.g. "oz", "cup", "whole" */
  unit?: string
}

export interface CreateShoppingListParams {
  title: string
  line_items: InstacartLineItem[]
  /** URL to link back to in the Instacart UI (e.g. your grocery list page) */
  partner_linkback_url?: string
}

/**
 * Creates a shoppable list page on Instacart and returns the URL to redirect
 * the user to. The URL is valid for 24 hours.
 *
 * Throws if INSTACART_API_KEY is not set or if the API returns an error.
 */
export async function createInstacartShoppingList(
  params: CreateShoppingListParams
): Promise<string> {
  const apiKey = process.env.INSTACART_API_KEY
  if (!apiKey) {
    throw new Error('INSTACART_API_KEY is not configured')
  }

  const res = await fetch(`${INSTACART_API_BASE}/v2/products/products_link`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      title: params.title,
      line_items: params.line_items,
      partner_linkback_url: params.partner_linkback_url,
    }),
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Instacart API error ${res.status}: ${body}`)
  }

  const data = (await res.json()) as { products_link_url?: string }

  if (!data.products_link_url) {
    throw new Error('Instacart response missing products_link_url')
  }

  return data.products_link_url
}

/** Returns true when the Instacart API key is present in the environment. */
export function isInstacartConfigured(): boolean {
  return Boolean(process.env.INSTACART_API_KEY)
}
