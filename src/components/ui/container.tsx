import React from 'react'
import { cn } from '~/lib/utils'

export const Container = ({
  className,
  ...restDivProps
}: React.ComponentPropsWithoutRef<'div'>) => {
  return (
    <div
      className={cn('container px-4 mx-auto', className)}
      {...restDivProps}
    />
  )
}
