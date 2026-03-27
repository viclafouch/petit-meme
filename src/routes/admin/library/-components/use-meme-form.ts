import { toast } from 'sonner'
import type { z } from 'zod'
import type { MemeFullData } from '~/constants/meme'
import type { Meme } from '~/db/generated/prisma/client'
import { getErrorMessage } from '~/helpers/error'
import {
  buildLocaleRecord,
  findTranslationByLocale,
  getRequiredLocales
} from '~/helpers/i18n-content'
import { useKeywordsField } from '~/hooks/use-keywords-field'
import { getCategoriesListQueryOpts } from '~/lib/queries'
import { captureWithFeature } from '~/lib/sentry'
import { baseLocale, type Locale } from '~/paraglide/runtime'
import { translateMemeContent } from '~/server/ai'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery } from '@tanstack/react-query'

import { editMeme, MEME_FORM_SCHEMA } from '~admin/-server/memes'

type UseMemeFormParams = {
  meme: MemeFullData
  onSuccess?: () => void
}

export function useMemeForm({ meme, onSuccess }: UseMemeFormParams) {
  const categoriesListQuery = useQuery(getCategoriesListQueryOpts(baseLocale))

  const categoriesOptions =
    categoriesListQuery.data?.map((category) => {
      return {
        label: category.title,
        value: category.id
      }
    }) ?? []

  const editMutation = useMutation({
    mutationKey: ['edit-meme'],
    mutationFn: async (
      body: z.infer<typeof MEME_FORM_SCHEMA> & { id: Meme['id'] }
    ) => {
      const promise = editMeme({ data: body })
      toast.promise(promise, {
        loading: 'Modification...',
        success: () => {
          return 'Mème modifié avec succès !'
        },
        error: getErrorMessage
      })

      return promise
    },
    onSuccess,
    onError: (error) => {
      captureWithFeature(error, 'admin-meme-edit')
    }
  })

  const form = useForm({
    defaultValues: {
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
      status: meme.status,
      categoryIds: meme.categories.map((category) => {
        return category.categoryId
      })
    },
    validators: {
      onChange: MEME_FORM_SCHEMA
    },
    onSubmit: async ({ value }) => {
      if (editMutation.isPending) {
        return
      }

      await editMutation.mutateAsync({
        contentLocale: value.contentLocale,
        translations: value.translations,
        tweetUrl: value.tweetUrl,
        status: value.status,
        id: meme.id,
        categoryIds: value.categoryIds
      })
    }
  })

  const frKeywordsField = useKeywordsField({
    setKeywordsValue: (updater) => {
      return form.setFieldValue('translations.fr.keywords', updater)
    }
  })

  const enKeywordsField = useKeywordsField({
    setKeywordsValue: (updater) => {
      return form.setFieldValue('translations.en.keywords', updater)
    }
  })

  const keywordsFields = {
    fr: frKeywordsField,
    en: enKeywordsField
  } satisfies Record<Locale, ReturnType<typeof useKeywordsField>>

  const translateContentMutation = useMutation({
    mutationKey: ['translate-content'],
    mutationFn: (sourceLocale: Locale) => {
      const title = form.getFieldValue(`translations.${sourceLocale}.title`)
      const description = form.getFieldValue(
        `translations.${sourceLocale}.description`
      )
      const keywords = form.getFieldValue(
        `translations.${sourceLocale}.keywords`
      )

      const contentLocale = form.getFieldValue('contentLocale')
      const requiredLocales = getRequiredLocales(contentLocale)
      const targetLocales = requiredLocales.filter((locale) => {
        return locale !== sourceLocale
      })

      return translateMemeContent({
        data: {
          sourceLocale,
          targetLocales,
          title,
          description,
          keywords
        }
      })
    },
    onSuccess: (result) => {
      for (const locale of Object.keys(result) as Locale[]) {
        const translation = result[locale]

        if (!translation) {
          continue
        }

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

      toast.success('Traduction terminée !')
    },
    onError: (error) => {
      captureWithFeature(error, 'ai-translation')
      toast.error(getErrorMessage(error))
    }
  })

  const isLocaleRequired = (locale: Locale) => {
    const contentLocale = form.getFieldValue('contentLocale')
    const required = getRequiredLocales(contentLocale)

    return required.includes(locale)
  }

  return {
    form,
    keywordsFields,
    categoriesListQuery,
    categoriesOptions,
    translateContentMutation,
    isLocaleRequired
  }
}
