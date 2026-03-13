import { FormFooter } from '@/components/form-footer'
import { CONTENT_LOCALE_FLAGS, FLAG_ICON_CLASS } from '@/components/icon/flags'
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { type MemeFullData } from '@/constants/meme'
import type { MemeContentLocale } from '@/db/generated/prisma/enums'
import {
  getContentLocaleOptions,
  getRequiredLocales
} from '@/helpers/i18n-content'
import { getFieldErrorMessage } from '@/lib/utils'
import { locales } from '@/paraglide/runtime'
import { MemeFormMetadataFields } from './meme-form-metadata-fields'
import { MemeTranslationSection } from './meme-translation-section'
import { useMemeForm } from './use-meme-form'

type MemeFormParams = {
  meme: MemeFullData
  onSuccess?: () => void
}

export const MemeForm = ({ meme, onSuccess }: MemeFormParams) => {
  const {
    form,
    keywordsFields,
    categoriesListQuery,
    categoriesOptions,
    generateContentMutation,
    translateContentMutation,
    isLocaleRequired
  } = useMemeForm({ meme, onSuccess })

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
        <form.Field
          name="contentLocale"
          children={(field) => {
            const errorMessage = getFieldErrorMessage({ field })

            return (
              <FormItem error={errorMessage}>
                <FormLabel>Langue du contenu</FormLabel>
                <FormControl>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) => {
                      return field.handleChange(value as MemeContentLocale)
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sélectionnez une langue" />
                    </SelectTrigger>
                    <SelectContent>
                      {getContentLocaleOptions().map((option) => {
                        const Flag = CONTENT_LOCALE_FLAGS[option.value]

                        return (
                          <SelectItem key={option.value} value={option.value}>
                            <span className="flex items-center gap-2">
                              {Flag ? (
                                <Flag className={FLAG_ICON_CLASS} />
                              ) : null}
                              {option.label}
                            </span>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </FormControl>
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
                      <form.Field
                        key={locale}
                        name={`translations.${locale}.title`}
                        children={(titleField) => {
                          return (
                            <form.Field
                              name={`translations.${locale}.description`}
                              children={(descriptionField) => {
                                return (
                                  <form.Field
                                    name={`translations.${locale}.keywords`}
                                    children={(keywordsFieldApi) => {
                                      return (
                                        <MemeTranslationSection
                                          locale={locale}
                                          titleField={titleField}
                                          descriptionField={descriptionField}
                                          keywordsFieldApi={keywordsFieldApi}
                                          keywordsField={keywordsFields[locale]}
                                          isGenerating={
                                            generateContentMutation.isPending
                                              ? generateContentMutation.variables ===
                                                locale
                                              : false
                                          }
                                          onGenerateContent={() => {
                                            return generateContentMutation.mutate(
                                              locale
                                            )
                                          }}
                                          isTranslateVisible={
                                            contentLocale === 'UNIVERSAL'
                                          }
                                          isTranslating={
                                            translateContentMutation.isPending
                                              ? translateContentMutation.variables ===
                                                locale
                                              : false
                                          }
                                          onTranslate={() => {
                                            return translateContentMutation.mutate(
                                              locale
                                            )
                                          }}
                                        />
                                      )
                                    }}
                                  />
                                )
                              }}
                            />
                          )
                        }}
                      />
                    )
                  })}
              </>
            )
          }}
        />
        <form.Field
          name="status"
          children={(statusField) => {
            return (
              <form.Field
                name="categoryIds"
                children={(categoryIdsField) => {
                  return (
                    <form.Field
                      name="tweetUrl"
                      children={(tweetUrlField) => {
                        return (
                          <MemeFormMetadataFields
                            statusField={statusField}
                            categoryIdsField={categoryIdsField}
                            tweetUrlField={tweetUrlField}
                            categoriesOptions={categoriesOptions}
                            isCategoriesLoading={categoriesListQuery.isLoading}
                            categoriesError={categoriesListQuery.error}
                          />
                        )
                      }}
                    />
                  )
                }}
              />
            )
          }}
        />
      </div>
      <form.Subscribe
        selector={(state) => {
          return [state.canSubmit, state.isSubmitting]
        }}
        children={([canSubmit = false, isSubmitting = false]) => {
          return (
            <FormFooter
              canSubmit={canSubmit}
              isSubmitting={isSubmitting}
              submitLabel="Enregistrer"
              isLoadingButton
              formId="edit-meme-form"
            />
          )
        }}
      />
    </form>
  )
}
