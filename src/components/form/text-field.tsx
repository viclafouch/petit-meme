import type React from 'react'
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage
} from '~/components/ui/form'
import { Input } from '~/components/ui/input'
import { useFieldContext } from '~/hooks/form-context'
import { getFieldErrorMessage } from '~/lib/form'

type TextFieldProps = {
  label: string
} & Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange' | 'onBlur'>

export const TextField = ({ label, ...inputProps }: TextFieldProps) => {
  const field = useFieldContext<string>()

  return (
    <FormItem error={getFieldErrorMessage(field.state.meta)}>
      <FormLabel>{label}</FormLabel>
      <FormControl
        render={
          <Input
            name={field.name}
            {...inputProps}
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={(event) => {
              field.handleChange(event.target.value)
            }}
          />
        }
      />
      <FormMessage />
    </FormItem>
  )
}
