import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '~/lib/utils'
import { Slot } from '@radix-ui/react-slot'

const buttonVariants = cva(
  "inline-flex relative items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          'border border-transparent bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
        defaultWithOutline: `bg-transparent text-primary-foreground border border-border hover:border-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 dark:text-primary-foreground before:-z-10 before:content-[""] before:absolute before:top-1/2 before:left-1/2 dark:hover:border-foreground before:-translate-x-1/2 before:-translate-y-1/2 before:w-[calc(100%-6px)] before:h-[calc(100%-6px)] before:rounded-sm before:bg-primary  before:transition-colors duration-500`,
        secondaryWithOutline:
          'bg-transparent text-secondary-foreground border border-border hover:border-foreground dark:bg-input/30 dark:border-input dark:hover:border-primary dark:hover:bg-input/50 dark:text-secondary-foreground before:-z-10 before:content-[""] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-[calc(100%-6px)] before:h-[calc(100%-6px)] before:rounded-sm before:bg-secondary before:transition-colors duration-500',
        destructive:
          'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        success:
          'bg-success text-success-foreground hover:bg-success/90 border border-success-foreground/10',
        warning:
          'bg-warning text-warning-foreground hover:bg-warning/90 border border-warning-foreground/10',
        info: 'bg-info text-info-foreground hover:bg-info/90 border border-info-foreground/10',
        outline:
          'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 text-primary',
        secondary:
          'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
        ghost:
          'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 text-primary',
        link: 'text-primary underline-offset-4 hover:underline'
      },
      active: {
        true: 'border-ring ring-primary/50 ring-[3px]'
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: "size-9 [&_svg:not([class*='size-'])]:size-4",
        iconLg: "size-9 [&_svg:not([class*='size-'])]:size-5",
        xl: 'h-12 rounded-md px-8 has-[>svg]:px-6'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

const Button = ({
  className,
  variant,
  size,
  active,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) => {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className, active }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
