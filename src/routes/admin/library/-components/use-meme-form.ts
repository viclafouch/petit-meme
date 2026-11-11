import { toast } from 'sonner'
import type { z } from 'zod'
import { revalidateLogic } from '@tanstack/react-form'
import { useMutation, useQuery } from '@tanstack/react-query'
import type { MemeFullData } from '~/constants/meme'
import { getErrorMessage } from '~/helpers/error'
import {
  buildLocaleRecord,
  findTranslationByLocale,
  getRequiredLocales
} from '~/helpers/i18n-content'
import { useAppForm } from '~/hooks/use-app-form'
import { useKeywordsField } from '~/hooks/use-keywords-field'
import { focusFirstInvalidField } from '~/lib/form'
import { getCategoriesListQueryOpts } from '~/lib/queries'
import { baseLocale, isLocale, type Locale } from '~/paraglide/runtime'
import {
  getMemeFormSchema,
  type MEME_FORM_SCHEMA,
  PUBLISHABLE_MEME_FORM_SCHEMA
} from '~/routes/admin/-server/memes'
import { translateMemeContent } from '~/server/ai'

export type MemeFormValues = z.infer<typeof MEME_FORM_SCHEMA>

export const buildMemeFormValues = (meme: MemeFullData): MemeFormValues => {
  return {
    contentLocale: meme.contentLocale,
    translations: buildLocaleRecord((locale) => {
      const translation = findTranslationByLocale(meme.translations, locale)

      return {
        title: translation?.title ?? '',
        description: translation?.description ?? '',
        keywords: translation?.keywords ?? []
      }
    }),
    tweetUrl: meme.tweetUrl,
    categoryIds: meme.categories.map((category) => {
      return category.categoryId
    })
  }
}

type UseMemeFormParams = {
  meme: MemeFullData
  onChange: (values: MemeFormValues) => void
  onSubmit: (values: MemeFormValues) => Promise<void>
}

export function useMemeForm({ meme, onChange, onSubmit }: UseMemeFormParams) {
  const categoriesListQuery = useQuery(getCategoriesListQueryOpts(baseLocale))

  const form = useAppForm({
    defaultValues: buildMemeFormValues(meme),
    validationLogic: revalidateLogic(),
    validators: {
      onChange: getMemeFormSchema(meme.status),
      onDynamic: PUBLISHABLE_MEME_FORM_SCHEMA
    },
    listeners: {
      onChange: ({ formApi }) => {
        onChange(formApi.state.values)
      }
    },
    onSubmitInvalid: focusFirstInvalidField,
    onSubmit: ({ value }) => {
      return onSubmit(value)
    }
  })

  const frKeywordsField = useKeywordsField({
    setKeywordsValue: (updater) => {
      form.setFieldValue('translations.fr.keywords', updater)
    }
  })

  const enKeywordsField = useKeywordsField({
    setKeywordsValue: (updater) => {
      form.setFieldValue('translations.en.keywords', updater)
    }
  })

  const keywordsFields = {
    fr: frKeywordsField,
    en: enKeywordsField
  } satisfies Record<Locale, ReturnType<typeof useKeywordsField>>

  const translateContentMutation = useMutation({
    mutationKey: ['translate-content'],
    mutationFn: (sourceLocale: Locale) => {
      const contentLocale = form.getFieldValue('contentLocale')
      const targetLocales = getRequiredLocales(contentLocale).filter(
        (locale) => {
          return locale !== sourceLocale
        }
      )

      return translateMemeContent({
        data: {
          sourceLocale,
          targetLocales,
          title: form.getFieldValue(`translations.${sourceLocale}.title`),
          description: form.getFieldValue(
            `translations.${sourceLocale}.description`
          ),
          keywords: form.getFieldValue(`translations.${sourceLocale}.keywords`)
        }
      })
    },
    onSuccess: (result) => {
      for (const [locale, translation] of Object.entries(result)) {
        if (isLocale(locale)) {
          form.setFieldValue(`translations.${locale}.title`, translation.title)
          form.setFieldValue(
            `translations.${locale}.description`,
            translation.description
          )
          form.setFieldValue(
            `translations.${locale}.keywords`,
            translation.keywords
          )
        }
      }

      toast.success('Traduction terminée !')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    }
  })

  const flushPendingKeywords = () => {
    for (const locale of getRequiredLocales(
      form.getFieldValue('contentLocale')
    )) {
      keywordsFields[locale].handleAddKeyword()
    }
  }

  return {
    form,
    keywordsFields,
    categoriesListQuery,
    translateContentMutation,
    flushPendingKeywords
  }
}

export type MemeFormApi = ReturnType<typeof useMemeForm>['form']
