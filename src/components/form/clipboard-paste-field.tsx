import type React from 'react'
import { ClipboardPasteInput } from '~/components/form/clipboard-paste-input'
import { useFieldContext } from '~/components/form/form-context'
import { FormItem, FormLabel, FormMessage } from '~/components/ui/form'
import { getFieldErrorMessage } from '~/lib/form'

type ClipboardPasteFieldProps = {
  label: string
} & Omit<
  React.ComponentProps<typeof ClipboardPasteInput>,
  'value' | 'onChange' | 'onBlur' | 'onClipboardPaste'
>

export const ClipboardPasteField = ({
  label,
  ...inputProps
}: ClipboardPasteFieldProps) => {
  const field = useFieldContext<string>()

  return (
    <FormItem error={getFieldErrorMessage(field.state.meta)}>
      <FormLabel>{label}</FormLabel>
      <ClipboardPasteInput
        name={field.name}
        {...inputProps}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(event) => {
          field.handleChange(event.target.value)
        }}
        onClipboardPaste={(text) => {
          field.handleChange(text)
        }}
      />
      <FormMessage />
    </FormItem>
  )
}
