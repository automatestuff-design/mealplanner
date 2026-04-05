'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ImportRecipeDialog } from '@/components/recipes/ImportRecipeDialog'

export function ImportButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Download className="h-4 w-4" />
        Import from URL
      </Button>
      <ImportRecipeDialog open={open} onClose={() => setOpen(false)} />
    </>
  )
}
