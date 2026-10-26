import { cva, type VariantProps } from 'class-variance-authority'
import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cn } from '~/lib/utils'

const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-xs hover:bg-primary/80',
        defaultWithOutline: `before:-translate-x-1/2 before:-translate-y-1/2 before:-z-10 before:absolute before:bg-primary before:content-[""] before:h-[calc(100%-6px)] before:left-1/2 before:rounded-sm before:top-1/2 before:transition-colors before:w-[calc(100%-6px)] bg-transparent border-border dark:bg-input/30 dark:border-input dark:hover:bg-input/50 dark:hover:border-foreground dark:text-primary-foreground duration-500 hover:border-foreground text-primary-foreground`,
        secondaryWithOutline:
          'before:-translate-x-1/2 before:-translate-y-1/2 before:-z-10 before:absolute before:bg-secondary before:content-[""] before:h-[calc(100%-6px)] before:left-1/2 before:rounded-sm before:top-1/2 before:transition-colors before:w-[calc(100%-6px)] bg-transparent border-border dark:bg-input/30 dark:border-input dark:hover:bg-input/50 dark:hover:border-primary dark:text-secondary-foreground duration-500 hover:border-foreground text-secondary-foreground',
        destructive:
          'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40',
        success:
          'border-success-foreground/10 bg-success text-success-foreground hover:bg-success/90',
        warning:
          'border-warning-foreground/10 bg-warning text-warning-foreground hover:bg-warning/90',
        info: 'border-info-foreground/10 bg-info text-info-foreground hover:bg-info/90',
        outline:
          'border-border bg-background text-primary shadow-xs hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50',
        secondary:
          'bg-secondary text-secondary-foreground shadow-xs hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
        ghost:
          'text-primary hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50',
        link: 'text-primary underline-offset-4 hover:underline'
      },
      active: {
        true: 'border-ring ring-[3px] ring-primary/50'
      },
      size: {
        default:
          'h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        sm: 'h-8 gap-1 rounded-[min(var(--radius-md),10px)] px-2.5 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5',
        lg: 'h-10 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        xl: 'h-12 gap-2 px-8 has-[>svg]:px-6',
        icon: 'size-9',
        'icon-xs':
          "size-6 rounded-[min(var(--radius-md),8px)] [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'size-8 rounded-[min(var(--radius-md),10px)]',
        iconLg: "size-9 [&_svg:not([class*='size-'])]:size-5"
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

function Button({
  className,
  variant,
  size,
  active,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, active, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
