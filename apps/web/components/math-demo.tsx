'use client'

import { sum } from '@repo/shared'
import { Badge } from '@/components/ui/badge'

export function MathDemo() {
  const result = sum(1, 2, 3)
  
  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-muted-foreground">Math from shared package:</span>
      <Badge variant="secondary">sum(1, 2, 3) = {result}</Badge>
    </div>
  )
}