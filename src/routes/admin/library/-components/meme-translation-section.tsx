import { Languages } from 'lucide-react'
import { FLAG_ICON_CLASS, LOCALE_FLAGS } from '~/components/icon/flags'
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage
} from '~/components/ui/form'
import { LoadingButton } from '~/components/ui/loading-button'
import { Textarea } from '~/components/ui/textarea'
import { LOCALE_META } from '~/helpers/i18n-content'
import type { useKeywordsField } from '~/hooks/use-keywords-field'
import { getFieldErrorMessage } from '~/lib/form'
import type { Locale } from '~/paraglide/runtime'
import { KeywordsField } from '~/routes/admin/-components/keywords-field'
import { MEME_DESCRIPTION_MAX_LENGTH } from '~/routes/admin/-server/memes'
import type { MemeFormApi } from './use-meme-form'

const MIN_TITLE_LENGTH = 3

type MemeTranslationSectionProps = {
  form: MemeFormApi
  locale: Locale
  keywordsField: ReturnType<typeof useKeywordsField>
  isTranslateVisible: boolean
  isTranslating: boolean
  onTranslate: () => void
}

export const MemeTranslationSection = ({
  form,
  locale,
  keywordsField,
  isTranslateVisible,
  isTranslating,
  onTranslate
}: MemeTranslationSectionProps) => {
  const meta = LOCALE_META[locale]
  const Flag = LOCALE_FLAGS[locale]

  return (
    <fieldset className="flex flex-col gap-4 rounded-lg border p-4">
      <legend className="flex items-center gap-1.5 px-2 text-sm font-medium">
        <Flag className={FLAG_ICON_CLASS} />
        {meta.label}
      </legend>
      <form.AppField
        name={`translations.${locale}.title`}
        children={(field) => {
          return <field.TextField label="Titre" required type="text" />
        }}
      />
      <form.Field
        name={`translations.${locale}.description`}
        children={(field) => {
          return (
            <FormItem error={getFieldErrorMessage(field.state.meta)}>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  name={field.name}
                  onBlur={field.handleBlur}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value)
                  }}
                />
              </FormControl>
              <div className="flex items-center justify-end">
                <span className="text-xs text-muted-foreground">
                  {field.state.value.length}/{MEME_DESCRIPTION_MAX_LENGTH}{' '}
                  caractères
                </span>
              </div>
              <FormMessage />
            </FormItem>
          )
        }}
      />
      <form.AppField
        name={`translations.${locale}.keywords`}
        children={() => {
          return <KeywordsField {...keywordsField} />
        }}
      />
      {isTranslateVisible ? (
        <form.Subscribe
          selector={(state) => {
            return state.values.translations[locale]
          }}
          children={(translation) => {
            const canTranslate =
              translation.title.length >= MIN_TITLE_LENGTH &&
              translation.description.length > 0 &&
              translation.keywords.length > 0

            return (
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
            )
          }}
        />
      ) : null}
    </fieldset>
  )
}
