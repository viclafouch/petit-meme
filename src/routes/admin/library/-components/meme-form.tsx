import React from 'react'
import { Sparkles } from 'lucide-react'
import { CONTENT_LOCALE_FLAGS, FLAG_ICON_CLASS } from '~/components/icon/flags'
import { Button } from '~/components/ui/button'
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage
} from '~/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '~/components/ui/select'
import type { MemeFullData } from '~/constants/meme'
import {
  CONTENT_LOCALE_TO_LOCALE,
  getContentLocaleOptions,
  getRequiredLocales,
  matchIsMemeContentLocale
} from '~/helpers/i18n-content'
import { getFieldErrorMessage } from '~/lib/form'
import { type Locale, locales } from '~/paraglide/runtime'
import type { AiAssistResult } from '~/server/ai'
import { AiAssistDialog, type AiAssistFieldSelection } from './ai-assist-dialog'
import { MemeFormMetadataFields } from './meme-form-metadata-fields'
import { MemeTranslationSection } from './meme-translation-section'
import { useMemeForm } from './use-meme-form'

type MemeFormProps = {
  meme: MemeFullData
  onSuccess?: () => Promise<void>
}

export const MemeForm = ({ meme, onSuccess }: MemeFormProps) => {
  const {
    form,
    keywordsFields,
    categoriesListQuery,
    categoriesOptions,
    translateContentMutation,
    isLocaleRequired
  } = useMemeForm({ meme, onSuccess })

  const [isAiAssistOpen, setIsAiAssistOpen] = React.useState(false)

  const handleAiAssistApply = (
    locale: Locale,
    result: AiAssistResult,
    fields: AiAssistFieldSelection
  ) => {
    if (fields.title) {
      form.setFieldValue(`translations.${locale}.title`, result.title)
    }

    if (fields.description) {
      form.setFieldValue(
        `translations.${locale}.description`,
        result.description
      )
    }

    if (fields.keywords) {
      form.setFieldValue(`translations.${locale}.keywords`, result.keywords)
    }
  }

  const handleSubmit = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()

    for (const locale of locales) {
      if (isLocaleRequired(locale)) {
        keywordsFields[locale].handleAddKeyword()
      }
    }

    void form.handleSubmit()
  }

  return (
    <form
      id="edit-meme-form"
      noValidate
      className="flex flex-col gap-6"
      onSubmit={handleSubmit}
    >
      <div className="flex flex-col gap-6">
        <form.Subscribe
          selector={(state) => {
            return state.values.contentLocale
          }}
          children={(contentLocale) => {
            const applyLocale = CONTENT_LOCALE_TO_LOCALE[contentLocale]
            const currentValues = form.getFieldValue(
              `translations.${applyLocale}`
            )

            return (
              <>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsAiAssistOpen(true)
                    }}
                  >
                    <Sparkles aria-hidden />
                    AI Assist
                  </Button>
                </div>
                <AiAssistDialog
                  memeId={meme.id}
                  contentLocale={contentLocale}
                  currentValues={currentValues}
                  isOpen={isAiAssistOpen}
                  onOpenChange={setIsAiAssistOpen}
                  onApply={handleAiAssistApply}
                />
              </>
            )
          }}
        />
        <form.Field
          name="contentLocale"
          children={(field) => {
            return (
              <FormItem error={getFieldErrorMessage(field.state.meta)}>
                <FormLabel>Langue du contenu</FormLabel>
                <Select
                  value={field.state.value}
                  onValueChange={(value) => {
                    if (matchIsMemeContentLocale(value)) {
                      field.handleChange(value)
                    }
                  }}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sélectionnez une langue" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {getContentLocaleOptions().map((option) => {
                      const Flag = CONTENT_LOCALE_FLAGS[option.value]

                      return (
                        <SelectItem key={option.value} value={option.value}>
                          <span className="flex items-center gap-2">
                            {Flag ? <Flag className={FLAG_ICON_CLASS} /> : null}
                            {option.label}
                          </span>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )
          }}
        />
        <form.Subscribe
          selector={(state) => {
            return state.values.contentLocale
          }}
          children={(contentLocale) => {
            const requiredLocales = getRequiredLocales(contentLocale)

            return (
              <>
                {locales
                  .filter((locale) => {
                    return requiredLocales.includes(locale)
                  })
                  .map((locale) => {
                    return (
                      <MemeTranslationSection
                        key={locale}
                        form={form}
                        locale={locale}
                        keywordsField={keywordsFields[locale]}
                        isTranslateVisible={contentLocale === 'UNIVERSAL'}
                        isTranslating={
                          translateContentMutation.isPending
                            ? translateContentMutation.variables === locale
                            : false
                        }
                        onTranslate={() => {
                          translateContentMutation.mutate(locale)
                        }}
                      />
                    )
                  })}
              </>
            )
          }}
        />
        <MemeFormMetadataFields
          form={form}
          categoriesOptions={categoriesOptions}
          isCategoriesLoading={categoriesListQuery.isLoading}
          categoriesError={categoriesListQuery.error}
        />
      </div>
      <form.AppForm>
        <form.FormFooter
          submitLabel="Enregistrer"
          isLoadingButton
          formId="edit-meme-form"
        />
      </form.AppForm>
    </form>
  )
}
