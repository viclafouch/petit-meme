import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '~/lib/utils'

const titleVariants = cva(
  'font-bricolage text-foreground max-w-4xl text-center font-semibold text-balance mx-auto',
  {
    variants: {
      size: {
        h1: 'text-4xl leading-[1.1] sm:text-5xl lg:text-6xl',
        h2: 'text-3xl leading-[1.1] sm:text-4xl lg:text-5xl'
      }
    },
    defaultVariants: {
      size: 'h1'
    }
  }
)

const Title = ({
  className,
  size,
  ...props
}: React.ComponentProps<'h1'> &
  VariantProps<typeof titleVariants> & {
    asChild?: boolean
  }) => {
  return (
    <h1 className={cn(titleVariants({ size, className }))} {...props}>
      {props.children}
    </h1>
  )
}

export { Title, titleVariants }
