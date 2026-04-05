'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { createRecipe } from '@/lib/api/recipes'
import type { ScrapedRecipe } from '@/lib/scrapers'

const PLATFORM_HINTS: Record<string, { label: string; color: string; example: string }> = {
  tiktok: { label: 'TikTok', color: 'bg-black text-white', example: 'tiktok.com/@user/video/...' },
  pinterest: { label: 'Pinterest', color: 'bg-red-600 text-white', example: 'pinterest.com/pin/...' },
  instagram: { label: 'Instagram', color: 'bg-pink-600 text-white', example: 'instagram.com/p/...' },
  web: { label: 'Recipe Site', color: 'bg-green-600 text-white', example: 'allrecipes.com, bbcgoodfood.com...' },
}

function detectPlatformLabel(url: string) {
  if (url.includes('tiktok.com')) return 'tiktok'
  if (url.includes('pinterest.com') || url.includes('pin.it')) return 'pinterest'
  if (url.includes('instagram.com')) return 'instagram'
  return 'web'
}

interface ImportRecipeDialogProps {
  open: boolean
  onClose: () => void
}

export function ImportRecipeDialog({ open, onClose }: ImportRecipeDialogProps) {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<ScrapedRecipe | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const platform = url ? detectPlatformLabel(url) : null
  const platformInfo = platform ? PLATFORM_HINTS[platform] : null

  const handleImport = async () => {
    if (!url.trim()) return
    setError(null)
    setPreview(null)
    setLoading(true)

    try {
      const res = await fetch('/api/recipes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Import failed')
      setPreview(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!preview) return
    setSaving(true)

    try {
      // Build ingredient list — filter out empties
      const ingredients = preview.ingredients.length > 0
        ? preview.ingredients.map((ing) => ({
            ingredientId: '',
            ingredientName: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            notes: ing.notes,
          }))
        : [{ ingredientId: '', ingredientName: 'See recipe source', quantity: 1, unit: 'whole' }]

      await createRecipe({
        title: preview.title,
        description: preview.description,
        instructions: preview.instructions || `See original recipe: ${preview.sourceUrl}`,
        prepTime: preview.prepTime ?? null,
        cookTime: preview.cookTime ?? null,
        servings: preview.servings ?? 1,
        imageUrl: preview.imageUrl ?? null,
        tags: [preview.sourcePlatform],
        isPublic: false,
        ingredients,
      })

      setSaved(true)
      router.refresh()
      setTimeout(() => {
        onClose()
        setUrl('')
        setPreview(null)
        setSaved(false)
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save recipe')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    if (loading || saving) return
    onClose()
    setUrl('')
    setPreview(null)
    setError(null)
    setSaved(false)
  }

  const confidenceInfo = {
    high: { label: 'Full recipe extracted', icon: <CheckCircle2 className="h-4 w-4 text-green-600" /> },
    medium: { label: 'Partial data — review before saving', icon: <AlertCircle className="h-4 w-4 text-amber-600" /> },
    low: { label: 'Limited data — you will need to fill in details', icon: <AlertCircle className="h-4 w-4 text-red-500" /> },
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Import Recipe from URL
          </DialogTitle>
          <DialogDescription>
            Paste a link from a recipe website, TikTok, Pinterest, or Instagram.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Platform badges */}
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(PLATFORM_HINTS).map(([key, info]) => (
              <span key={key} className={`text-xs px-2 py-0.5 rounded-full font-medium ${info.color}`}>
                {info.label}
              </span>
            ))}
          </div>

          {/* URL input */}
          <div className="space-y-2">
            <Label htmlFor="import-url">URL</Label>
            <div className="flex gap-2">
              <Input
                id="import-url"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setPreview(null); setError(null) }}
                placeholder="https://..."
                onKeyDown={(e) => e.key === 'Enter' && handleImport()}
              />
              <Button onClick={handleImport} disabled={!url.trim() || loading}>
                {loading ? 'Fetching...' : 'Import'}
              </Button>
            </div>
            {platformInfo && url && (
              <p className="text-xs text-muted-foreground">
                Detected: <span className="font-medium">{platformInfo.label}</span>
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div className="space-y-4 rounded-lg border p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-base">{preview.title}</h3>
                  {preview.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {preview.description}
                    </p>
                  )}
                </div>
                {preview.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview.imageUrl}
                    alt={preview.title}
                    className="h-16 w-16 rounded-md object-cover shrink-0"
                  />
                )}
              </div>

              {/* Confidence indicator */}
              <div className="flex items-center gap-2 text-sm">
                {confidenceInfo[preview.confidence].icon}
                <span>{confidenceInfo[preview.confidence].label}</span>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                {preview.prepTime && <span>Prep: {preview.prepTime} min</span>}
                {preview.cookTime && <span>Cook: {preview.cookTime} min</span>}
                {preview.servings && <span>Serves: {preview.servings}</span>}
                <span>{preview.ingredients.length} ingredient{preview.ingredients.length !== 1 ? 's' : ''} found</span>
              </div>

              {/* Ingredients preview */}
              {preview.ingredients.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Ingredients
                  </p>
                  <ul className="text-sm space-y-0.5 max-h-32 overflow-auto">
                    {preview.ingredients.map((ing, i) => (
                      <li key={i} className="text-muted-foreground">
                        {ing.quantity} {ing.unit} <span className="capitalize">{ing.name}</span>
                        {ing.notes && <span className="text-xs"> ({ing.notes})</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Raw text for low confidence */}
              {preview.confidence === 'low' && preview.rawText && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Raw text (for reference)
                  </p>
                  <p className="text-xs text-muted-foreground bg-muted rounded p-2 max-h-24 overflow-auto whitespace-pre-wrap">
                    {preview.rawText.slice(0, 500)}
                  </p>
                </div>
              )}

              {/* Source link */}
              <a
                href={preview.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                View original source
              </a>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {saved ? (
                  <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                    <CheckCircle2 className="h-4 w-4" />
                    Recipe saved!
                  </div>
                ) : (
                  <>
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? 'Saving...' : 'Save to Recipes'}
                    </Button>
                    <Button variant="outline" onClick={() => setPreview(null)}>
                      Try another URL
                    </Button>
                  </>
                )}
              </div>

              {preview.confidence !== 'high' && (
                <p className="text-xs text-muted-foreground">
                  After saving, open the recipe and use Edit to fill in any missing details.
                </p>
              )}
            </div>
          )}

          {/* Platform notes */}
          {!preview && (
            <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground space-y-1">
              <p><span className="font-medium">Recipe sites</span> (AllRecipes, Food Network, BBC Good Food, etc.) — full extraction including ingredients and instructions.</p>
              <p><span className="font-medium">Pinterest</span> — follows the pin to its source recipe page when possible.</p>
              <p><span className="font-medium">TikTok / Instagram</span> — extracts title and any ingredients listed in the caption. You will need to add instructions manually.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
