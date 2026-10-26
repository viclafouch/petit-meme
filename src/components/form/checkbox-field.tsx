import React from 'react'
import { Checkbox } from '~/components/ui/checkbox'
import { FormControl, FormItem, FormMessage } from '~/components/ui/form'
import { useFieldContext } from '~/hooks/form-context'
import { getFieldErrorMessage } from '~/lib/form'

type CheckboxFieldProps = {
  label: React.ReactNode
}

export const CheckboxField = ({ label }: CheckboxFieldProps) => {
  const field = useFieldContext<boolean>()
  const checkboxId = React.useId()

  return (
    <FormItem error={getFieldErrorMessage(field.state.meta)} className="w-full">
      <div className="flex items-start gap-2">
        <FormControl
          render={
            <Checkbox
              id={checkboxId}
              name={field.name}
              checked={field.state.value}
              onCheckedChange={(checked) => {
                field.handleChange(checked)
              }}
              onBlur={field.handleBlur}
            />
          }
        />
        <label
          htmlFor={checkboxId}
          className="text-xs text-muted-foreground leading-snug"
        >
          {label}
        </label>
      </div>
      <FormMessage />
    </FormItem>
  )
}
