import { Stars } from 'lucide-react'
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { LoadingButton } from '@/components/ui/loading-button'
import { Textarea } from '@/components/ui/textarea'
import { getFieldErrorMessage } from '@/lib/utils'
import type { AnyFieldApi } from '@tanstack/react-form'
import type { UseMutationResult } from '@tanstack/react-query'

type MemeFormDescriptionFieldParams = {
  field: AnyFieldApi
  generateContentMutation: UseMutationResult<unknown, Error, void, unknown>
}

export const MemeFormDescriptionField = ({
  field,
  generateContentMutation
}: MemeFormDescriptionFieldParams) => {
  const errorMessage = getFieldErrorMessage({ field })

  return (
    <FormItem error={errorMessage}>
      <FormLabel>Description</FormLabel>
      <FormControl>
        <Textarea
          required
          name={field.name}
          onBlur={field.handleBlur}
          value={field.state.value as string}
          onChange={(event) => {
            return field.handleChange(event.target.value)
          }}
        />
      </FormControl>
      <div className="flex justify-end gap-2 items-center">
        <span className="text-xs text-muted-foreground">
          {(field.state.value as string).length}/200 caractères
        </span>
        <LoadingButton
          isLoading={generateContentMutation.isPending}
          loadingText="Génération en cours..."
          size="sm"
          type="button"
          variant="default"
          onClick={() => {
            return generateContentMutation.mutate()
          }}
        >
          <Stars />
          Générer une description
        </LoadingButton>
      </div>
      <FormMessage />
    </FormItem>
  )
}
