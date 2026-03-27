import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '~/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-md border w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
        black:
          'border-transparent bg-black/70 text-white [a&]:hover:bg-secondary/90',
        destructive:
          'bg-destructive dark:bg-destructive/60 text-destructive-foreground border border-destructive-foreground/10',
        success:
          'bg-success text-success-foreground border border-success-foreground/10',
        warning:
          'bg-warning text-warning-foreground border border-warning-foreground/10',
        info: 'bg-info text-info-foreground border border-info-foreground/10',
        outline:
          'text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground'
      },
      size: {
        sm: 'px-1 py-0.5 text-xs font-normal',
        md: 'px-2 py-0.5 text-xs font-medium',
        lg: 'px-2 py-1 text-sm font-medium'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
)

const Badge = ({
  className,
  variant,
  size = 'md',
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) => {
  const Comp = asChild ? Slot : 'span'

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
