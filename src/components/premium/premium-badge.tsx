import React from 'react'
import { Sparkles } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages.js'

type PremiumBadgeProps = Omit<
  React.ComponentProps<typeof Badge>,
  'variant' | 'children'
>

export const PremiumBadge = ({
  className,
  ...restProps
}: PremiumBadgeProps) => {
  return (
    <Badge
      variant="amber"
      size="sm"
      className={cn('gap-0.5 font-medium', className)}
      {...restProps}
    >
      <Sparkles aria-hidden="true" />
      {m.premium_badge()}
    </Badge>
  )
}
