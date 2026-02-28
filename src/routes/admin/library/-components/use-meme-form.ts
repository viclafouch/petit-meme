import { toast } from 'sonner'
import type { z } from 'zod'
import type { MemeWithCategories } from '@/constants/meme'
import type { Meme } from '@/db/generated/prisma/client'
import { getErrorMessage } from '@/helpers/error'
import { useKeywordsField } from '@/hooks/use-keywords-field'
import { getCategoriesListQueryOpts } from '@/lib/queries'
import { captureWithFeature } from '@/lib/sentry'
import { generateMemeContent } from '@/server/ai'
import { removeDuplicates } from '@/utils/array'
import { editMeme, MEME_FORM_SCHEMA } from '@admin/-server/memes'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery } from '@tanstack/react-query'

type UseMemeFormParams = {
  meme: MemeWithCategories
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
      keywords: meme.keywords,
      tweetUrl: meme.tweetUrl,
      title: meme.title,
      description: meme.description,
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
        title: value.title,
        keywords: value.keywords,
        tweetUrl: value.tweetUrl,
        description: value.description,
        status: value.status,
        id: meme.id,
        categoryIds: value.categoryIds
      })
    }
  })

  const keywordsField = useKeywordsField({
    setKeywordsValue: (updater) => {
      return form.setFieldValue('keywords', updater)
    }
  })

  const generateContentMutation = useMutation({
    mutationKey: ['generate-content'],
    mutationFn: () => {
      return generateMemeContent({ data: { memeId: meme.id } })
    },
    onSuccess: (result) => {
      form.setFieldValue('description', result.description)
      form.setFieldValue('keywords', (prevValue) => {
        return removeDuplicates([...prevValue, ...result.keywords])
      })
    },
    onError: (error) => {
      captureWithFeature(error, 'ai-generation')
      toast.error(error.message)
    }
  })

  return {
    form,
    keywordsField,
    categoriesListQuery,
    categoriesOptions,
    generateContentMutation
  }
}
