import * as React from 'react'
import { type VariantProps } from 'class-variance-authority'
import { Radio } from '@base-ui/react/radio'
import { RadioGroup } from '@base-ui/react/radio-group'
import { toggleVariants } from '~/components/ui/toggle'
import { cn } from '~/lib/utils'

type RadioToggleGroupVariants = VariantProps<typeof toggleVariants>

const RadioToggleGroupContext = React.createContext<RadioToggleGroupVariants>({
  size: 'default',
  variant: 'default'
})

function RadioToggleGroup<Value>({
  className,
  variant,
  size,
  children,
  ...props
}: RadioGroup.Props<Value> & RadioToggleGroupVariants) {
  return (
    <RadioGroup
      data-slot="radio-toggle-group"
      data-variant={variant}
      data-size={size}
      className={cn(
        'group/toggle-group flex w-fit flex-row items-center rounded-md data-[variant=outline]:shadow-xs',
        className
      )}
      {...props}
    >
      <RadioToggleGroupContext value={{ variant, size }}>
        {children}
      </RadioToggleGroupContext>
    </RadioGroup>
  )
}

function RadioToggleGroupItem<Value>({
  className,
  ...props
}: Radio.Root.Props<Value>) {
  const { variant, size } = React.useContext(RadioToggleGroupContext)

  return (
    <Radio.Root
      data-slot="radio-toggle-group-item"
      data-variant={variant}
      data-size={size}
      className={cn(
        toggleVariants({ variant, size }),
        'min-w-0 flex-1 shrink-0 rounded-none px-2 shadow-none first:rounded-l-md last:rounded-r-md focus:z-10 focus-visible:z-10 data-checked:bg-muted data-disabled:pointer-events-none data-disabled:opacity-50 data-[variant=outline]:border-l-0 data-[variant=outline]:first:border-l',
        className
      )}
      {...props}
    />
  )
}

export { RadioToggleGroup, RadioToggleGroupItem }
