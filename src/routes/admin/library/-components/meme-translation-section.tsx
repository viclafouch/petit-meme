import { Stars } from 'lucide-react'
import { FLAG_ICON_CLASS, LOCALE_FLAGS } from '@/components/icon/flags'
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { LoadingButton } from '@/components/ui/loading-button'
import { Textarea } from '@/components/ui/textarea'
import { LOCALE_META } from '@/helpers/i18n-content'
import type { useKeywordsField } from '@/hooks/use-keywords-field'
import { getFieldErrorMessage } from '@/lib/utils'
import type { Locale } from '@/paraglide/runtime'
import { KeywordsField } from '@admin/-components/keywords-field'
import type { AnyFieldApi } from '@tanstack/react-form'

type MemeTranslationSectionParams = {
  locale: Locale
  titleField: AnyFieldApi
  descriptionField: AnyFieldApi
  keywordsFieldApi: AnyFieldApi
  keywordsField: ReturnType<typeof useKeywordsField>
  isGenerating: boolean
  onGenerateContent: () => void
}

export const MemeTranslationSection = ({
  locale,
  titleField,
  descriptionField,
  keywordsFieldApi,
  keywordsField,
  isGenerating,
  onGenerateContent
}: MemeTranslationSectionParams) => {
  const titleError = getFieldErrorMessage({ field: titleField })
  const descriptionError = getFieldErrorMessage({ field: descriptionField })
  const descriptionValue = descriptionField.state.value as string
  const meta = LOCALE_META[locale]
  const Flag = LOCALE_FLAGS[locale]

  return (
    <fieldset className="flex flex-col gap-4 rounded-lg border p-4">
      <legend className="flex items-center gap-1.5 px-2 text-sm font-medium">
        <Flag className={FLAG_ICON_CLASS} />
        {meta.label}
      </legend>
      <FormItem error={titleError}>
        <FormLabel>Titre</FormLabel>
        <FormControl>
          <Input
            required
            type="text"
            name={titleField.name}
            value={titleField.state.value as string}
            onBlur={titleField.handleBlur}
            onChange={(event) => {
              return titleField.handleChange(event.target.value)
            }}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
      <FormItem error={descriptionError}>
        <FormLabel>Description</FormLabel>
        <FormControl>
          <Textarea
            name={descriptionField.name}
            onBlur={descriptionField.handleBlur}
            value={descriptionValue}
            onChange={(event) => {
              return descriptionField.handleChange(event.target.value)
            }}
          />
        </FormControl>
        <div className="flex items-center justify-end gap-2">
          <span className="text-xs text-muted-foreground">
            {descriptionValue.length}/200 caractères
          </span>
          <LoadingButton
            isLoading={isGenerating}
            loadingText="Génération..."
            size="sm"
            type="button"
            variant="default"
            onClick={onGenerateContent}
          >
            <Stars />
            Générer
          </LoadingButton>
        </div>
        <FormMessage />
      </FormItem>
      <KeywordsField field={keywordsFieldApi} {...keywordsField} />
    </fieldset>
  )
}
