import { Languages } from 'lucide-react'
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
import { type FormFieldApi, getFieldErrorMessage } from '@/lib/utils'
import type { Locale } from '@/paraglide/runtime'
import { KeywordsField } from '@admin/-components/keywords-field'

const MIN_TITLE_LENGTH = 3

type MemeTranslationSectionParams = {
  locale: Locale
  titleField: FormFieldApi<string>
  descriptionField: FormFieldApi<string>
  keywordsFieldApi: FormFieldApi<string[]>
  keywordsField: ReturnType<typeof useKeywordsField>
  isTranslateVisible: boolean
  isTranslating: boolean
  onTranslate: () => void
}

export const MemeTranslationSection = ({
  locale,
  titleField,
  descriptionField,
  keywordsFieldApi,
  keywordsField,
  isTranslateVisible,
  isTranslating,
  onTranslate
}: MemeTranslationSectionParams) => {
  const titleError = getFieldErrorMessage({ field: titleField })
  const descriptionError = getFieldErrorMessage({ field: descriptionField })
  const meta = LOCALE_META[locale]
  const Flag = LOCALE_FLAGS[locale]

  const canTranslate =
    titleField.state.value.length >= MIN_TITLE_LENGTH &&
    descriptionField.state.value.length > 0 &&
    keywordsFieldApi.state.value.length > 0

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
            value={titleField.state.value}
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
            value={descriptionField.state.value}
            onChange={(event) => {
              return descriptionField.handleChange(event.target.value)
            }}
          />
        </FormControl>
        <div className="flex items-center justify-end">
          <span className="text-xs text-muted-foreground">
            {descriptionField.state.value.length}/200 caractères
          </span>
        </div>
        <FormMessage />
      </FormItem>
      <KeywordsField field={keywordsFieldApi} {...keywordsField} />
      {isTranslateVisible ? (
        <div className="flex justify-end border-t pt-4">
          <LoadingButton
            disabled={!canTranslate}
            isLoading={isTranslating}
            loadingText="Traduction..."
            size="sm"
            type="button"
            variant="outline"
            onClick={onTranslate}
          >
            <Languages />
            Traduire vers les autres langues
          </LoadingButton>
        </div>
      ) : null}
    </fieldset>
  )
}
