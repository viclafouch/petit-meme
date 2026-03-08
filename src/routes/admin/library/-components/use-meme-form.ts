import { toast } from 'sonner'
import type { z } from 'zod'
import type { MemeFullData } from '@/constants/meme'
import type { Meme } from '@/db/generated/prisma/client'
import { getErrorMessage } from '@/helpers/error'
import {
  buildLocaleRecord,
  findTranslationByLocale,
  REQUIRED_TRANSLATION_LOCALES
} from '@/helpers/i18n-content'
import { useKeywordsField } from '@/hooks/use-keywords-field'
import { getCategoriesListQueryOpts } from '@/lib/queries'
import { captureWithFeature } from '@/lib/sentry'
import type { Locale } from '@/paraglide/runtime'
import { generateMemeContent } from '@/server/ai'
import { removeDuplicates } from '@/utils/array'
import { editMeme, MEME_FORM_SCHEMA } from '@admin/-server/memes'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery } from '@tanstack/react-query'

type UseMemeFormParams = {
  meme: MemeFullData
  onSuccess?: () => void
}

export function useMemeForm({ meme, onSuccess }: UseMemeFormParams) {
  const categoriesListQuery = useQuery(getCategoriesListQueryOpts())

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

  const generateContentMutation = useMutation({
    mutationKey: ['generate-content'],
    mutationFn: (_locale: Locale) => {
      return generateMemeContent({ data: { memeId: meme.id } })
    },
    onSuccess: (result, locale) => {
      form.setFieldValue(
        `translations.${locale}.description`,
        result.description
      )
      form.setFieldValue(`translations.${locale}.keywords`, (prevValue) => {
        return removeDuplicates([...prevValue, ...result.keywords])
      })
    },
    onError: (error) => {
      captureWithFeature(error, 'ai-generation')
      toast.error(error.message)
    }
  })

  const isLocaleRequired = (locale: Locale) => {
    const contentLocale = form.getFieldValue('contentLocale')
    const required = REQUIRED_TRANSLATION_LOCALES[
      contentLocale
    ] as readonly Locale[]

    return required.includes(locale)
  }

  return {
    form,
    keywordsFields,
    categoriesListQuery,
    categoriesOptions,
    generateContentMutation,
    isLocaleRequired
  }
}
